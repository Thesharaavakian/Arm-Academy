import uuid
import io
import base64
from django.contrib.auth import authenticate
from django.core.cache import cache
from rest_framework.throttling import AnonRateThrottle
from rest_framework import viewsets, generics, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError

from .models import CustomUser, OTPVerification
from .serializers import UserSerializer, UserDetailSerializer, UserRegistrationSerializer
from .permissions import IsEmailVerified


# ── helpers ──────────────────────────────────────────────────────────────────

def _issue_tokens(user):
    refresh = RefreshToken.for_user(user)
    refresh['role'] = user.role
    refresh['email'] = user.email
    refresh['full_name'] = user.display_name
    return {'access': str(refresh.access_token), 'refresh': str(refresh)}


def _send_email_otp(user):
    otp = OTPVerification.create_for_user(user, OTPVerification.EMAIL)
    try:
        from .tasks import send_email_otp_task
        send_email_otp_task.delay(user.email, otp.code, user.first_name)
    except Exception:
        # Celery/Redis unavailable — send synchronously so dev still works
        _send_email_sync(user.email, otp.code, user.first_name)
    return otp


def _send_email_sync(email, code, name=''):
    from django.core.mail import send_mail
    from django.conf import settings as s
    try:
        send_mail(
            subject='Arm Academy — Verify Your Email',
            message=(
                f'Hi {name or "there"},\n\n'
                f'Your verification code is: {code}\n\n'
                'This code expires in 15 minutes.\n\nArm Academy'
            ),
            from_email=s.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=True,
        )
    except Exception:
        pass  # Email backend may also be unconfigured in dev — OTP is in DB


# ── Auth views ────────────────────────────────────────────────────────────────

class RegisterView(generics.CreateAPIView):
    queryset = CustomUser.objects.all()
    permission_classes = [AllowAny]
    serializer_class = UserRegistrationSerializer

    def create(self, request, *args, **kwargs):
        # Honeypot: bots fill hidden fields, humans leave them blank
        if request.data.get('website') or request.data.get('phone_confirm'):
            # Silent 201 — don't reveal bot detection to scrapers
            return Response({
                'requires_verification': True,
                'email': request.data.get('email', ''),
                'detail': 'Account created. Check your email for a verification code.',
            }, status=status.HTTP_201_CREATED)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        _send_email_otp(user)
        return Response({
            'requires_verification': True,
            'email': user.email,
            'detail': 'Account created. Check your email for a verification code.',
        }, status=status.HTTP_201_CREATED)


class CustomLoginView(generics.GenericAPIView):
    permission_classes = [AllowAny]

    _MAX_ATTEMPTS = 5
    _LOCKOUT_SECONDS = 900  # 15 minutes

    def _lockout_keys(self, identifier, ip):
        safe = identifier.replace('@', '_').replace('.', '_')[:30]
        return f'login_lock_{safe}_{ip}', f'login_tries_{safe}_{ip}'

    def post(self, request):
        identifier = request.data.get('username', '').strip()
        password   = request.data.get('password', '')
        ip         = request.META.get('HTTP_X_FORWARDED_FOR', request.META.get('REMOTE_ADDR', ''))[:45]

        lock_key, try_key = self._lockout_keys(identifier, ip)

        # Check lockout
        if cache.get(lock_key):
            return Response(
                {'detail': 'Too many failed attempts. Account locked for 15 minutes.'},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        # Allow login with email or username
        user = authenticate(request, username=identifier, password=password)
        if not user:
            try:
                u = CustomUser.objects.get(email__iexact=identifier)
                user = authenticate(request, username=u.username, password=password)
            except CustomUser.DoesNotExist:
                pass

        if not user or not user.is_active:
            tries = (cache.get(try_key) or 0) + 1
            cache.set(try_key, tries, self._LOCKOUT_SECONDS)
            if tries >= self._MAX_ATTEMPTS:
                cache.set(lock_key, True, self._LOCKOUT_SECONDS)
                return Response(
                    {'detail': 'Too many failed attempts. Account locked for 15 minutes.'},
                    status=status.HTTP_429_TOO_MANY_REQUESTS,
                )
            remaining = self._MAX_ATTEMPTS - tries
            return Response(
                {'detail': f'Invalid credentials. {remaining} attempt{"s" if remaining != 1 else ""} remaining.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # Success — clear lockout counters
        cache.delete(lock_key)
        cache.delete(try_key)

        # Email verification gate
        if not user.email_verified:
            _send_email_otp(user)
            return Response({
                'requires_verification': True,
                'email': user.email,
                'detail': 'Please verify your email. A new code has been sent.',
            })

        # 2FA gate
        if user.two_fa_enabled:
            temp = str(uuid.uuid4())
            cache.set(f'2fa_pre_auth_{temp}', user.pk, 300)
            return Response({'requires_2fa': True, 'temp_token': temp})

        tokens = _issue_tokens(user)
        return Response({'user': UserDetailSerializer(user).data, **tokens})


class VerifyEmailView(generics.GenericAPIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        code = request.data.get('code', '').strip()

        try:
            user = CustomUser.objects.get(email=email)
        except CustomUser.DoesNotExist:
            return Response({'detail': 'Account not found.'}, status=404)

        if user.email_verified:
            return Response({'detail': 'Email already verified.'}, status=400)

        otp = OTPVerification.objects.filter(
            user=user, otp_type=OTPVerification.EMAIL, code=code, is_used=False
        ).order_by('-created_at').first()

        if not otp or not otp.is_valid:
            return Response({'detail': 'Invalid or expired code.'}, status=400)

        otp.consume()
        user.email_verified = True
        user.save(update_fields=['email_verified'])

        from .tasks import send_welcome_email_task
        send_welcome_email_task.delay(user.email, user.first_name, user.role)

        tokens = _issue_tokens(user)
        return Response({'user': UserDetailSerializer(user).data, **tokens})


class ResendEmailOTPView(generics.GenericAPIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        try:
            user = CustomUser.objects.get(email=email)
        except CustomUser.DoesNotExist:
            # Don't reveal whether email exists
            return Response({'detail': 'If this email exists, a new code has been sent.'})
        if not user.email_verified:
            _send_email_otp(user)
        return Response({'detail': 'If this email exists, a new code has been sent.'})


class Verify2FAView(generics.GenericAPIView):
    permission_classes = [AllowAny]

    def post(self, request):
        try:
            import pyotp
        except ImportError:
            return Response({'detail': 'pyotp not installed.'}, status=500)

        temp_token = request.data.get('temp_token', '')
        code = request.data.get('code', '').strip()

        user_pk = cache.get(f'2fa_pre_auth_{temp_token}')
        if not user_pk:
            return Response({'detail': 'Session expired. Please log in again.'}, status=400)

        try:
            user = CustomUser.objects.get(pk=user_pk)
        except CustomUser.DoesNotExist:
            return Response({'detail': 'User not found.'}, status=400)

        totp = pyotp.TOTP(user.totp_secret)
        if not totp.verify(code, valid_window=1):
            return Response({'detail': 'Invalid or expired code.'}, status=400)

        cache.delete(f'2fa_pre_auth_{temp_token}')
        tokens = _issue_tokens(user)
        return Response({'user': UserDetailSerializer(user).data, **tokens})


class Setup2FAView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated, IsEmailVerified]

    def get(self, request):
        """Generate TOTP secret + QR code for the authenticated user."""
        try:
            import pyotp
            import qrcode
        except ImportError:
            return Response({'detail': 'pyotp/qrcode not installed.'}, status=500)

        secret = pyotp.random_base32()
        cache.set(f'totp_setup_{request.user.pk}', secret, 600)

        uri = pyotp.TOTP(secret).provisioning_uri(
            request.user.email, issuer_name='Arm Academy'
        )
        img = qrcode.make(uri)
        buf = io.BytesIO()
        img.save(buf, format='PNG')
        qr_b64 = base64.b64encode(buf.getvalue()).decode()

        return Response({
            'secret': secret,
            'qr_code': f'data:image/png;base64,{qr_b64}',
            'provisioning_uri': uri,
        })

    def post(self, request):
        """Confirm 2FA setup with the first TOTP code."""
        try:
            import pyotp
        except ImportError:
            return Response({'detail': 'pyotp not installed.'}, status=500)

        code = request.data.get('code', '').strip()
        secret = cache.get(f'totp_setup_{request.user.pk}')
        if not secret:
            return Response({'detail': 'Setup session expired. Please start over.'}, status=400)

        if not pyotp.TOTP(secret).verify(code, valid_window=1):
            return Response({'detail': 'Invalid code.'}, status=400)

        request.user.totp_secret = secret
        request.user.two_fa_enabled = True
        request.user.save(update_fields=['totp_secret', 'two_fa_enabled'])
        cache.delete(f'totp_setup_{request.user.pk}')
        return Response({'detail': '2FA enabled successfully.'})

    def delete(self, request):
        """Disable 2FA after confirming with current TOTP code."""
        try:
            import pyotp
        except ImportError:
            return Response({'detail': 'pyotp not installed.'}, status=500)

        code = request.data.get('code', '').strip()
        if not request.user.two_fa_enabled:
            return Response({'detail': '2FA is not currently enabled.'}, status=400)

        if not pyotp.TOTP(request.user.totp_secret).verify(code, valid_window=1):
            return Response({'detail': 'Invalid code.'}, status=400)

        request.user.totp_secret = None
        request.user.two_fa_enabled = False
        request.user.save(update_fields=['totp_secret', 'two_fa_enabled'])
        return Response({'detail': '2FA disabled.'})


class SendPhoneOTPView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        phone = request.data.get('phone_number', '').strip()
        if not phone:
            return Response({'detail': 'Phone number required.'}, status=400)

        request.user.phone_number = phone
        request.user.save(update_fields=['phone_number'])

        otp = OTPVerification.create_for_user(request.user, OTPVerification.PHONE, expires_minutes=10)
        from .tasks import send_phone_otp_task, _zadarma_send
        try:
            send_phone_otp_task.delay(phone, otp.code)
        except Exception:
            # Celery unavailable — send synchronously via Zadarma
            _zadarma_send(phone, f'Arm Academy: Your code is {otp.code}. Valid 10 min. Do not share.')
        return Response({'detail': 'Verification code sent to your phone.'})


class VerifyPhoneView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        code = request.data.get('code', '').strip()
        otp = OTPVerification.objects.filter(
            user=request.user, otp_type=OTPVerification.PHONE, code=code, is_used=False
        ).order_by('-created_at').first()

        if not otp or not otp.is_valid:
            return Response({'detail': 'Invalid or expired code.'}, status=400)

        otp.consume()
        request.user.phone_verified = True
        request.user.save(update_fields=['phone_verified'])
        return Response({'detail': 'Phone number verified.'})


class LogoutView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            RefreshToken(request.data.get('refresh', '')).blacklist()
        except TokenError:
            pass
        return Response({'detail': 'Logged out.'})


# ── Rate-limited throttle classes ─────────────────────────────────────────────


class LoginThrottle(AnonRateThrottle):
    scope = 'login'


class OTPThrottle(AnonRateThrottle):
    scope = 'otp'


class PasswordResetThrottle(AnonRateThrottle):
    scope = 'password_reset'


# ── Password reset ────────────────────────────────────────────────────────────

class ForgotPasswordView(generics.GenericAPIView):
    permission_classes = [AllowAny]
    throttle_classes = [PasswordResetThrottle]

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        # Always return 200 — don't reveal if email exists
        try:
            user = CustomUser.objects.get(email=email)
            otp = OTPVerification.create_for_user(user, OTPVerification.EMAIL, expires_minutes=30)
            try:
                from .tasks import send_password_reset_task
                send_password_reset_task.delay(user.email, otp.code, user.first_name)
            except Exception:
                _send_email_sync(user.email, otp.code, user.first_name)
        except CustomUser.DoesNotExist:
            pass
        return Response({'detail': 'If that email exists, a reset code has been sent.'})


class ResetPasswordView(generics.GenericAPIView):
    permission_classes = [AllowAny]
    throttle_classes = [PasswordResetThrottle]

    def post(self, request):
        email       = request.data.get('email', '').strip().lower()
        code        = request.data.get('code', '').strip()
        new_password = request.data.get('new_password', '')

        if len(new_password) < 8:
            return Response({'detail': 'Password must be at least 8 characters.'}, status=400)

        try:
            user = CustomUser.objects.get(email=email)
        except CustomUser.DoesNotExist:
            return Response({'detail': 'Invalid request.'}, status=400)

        otp = OTPVerification.objects.filter(
            user=user, otp_type=OTPVerification.EMAIL, code=code, is_used=False
        ).order_by('-created_at').first()

        if not otp or not otp.is_valid:
            return Response({'detail': 'Invalid or expired code.'}, status=400)

        otp.consume()
        user.set_password(new_password)
        user.save(update_fields=['password'])

        # Blacklist all existing tokens by rotating (optional — uncomment if needed)
        # from rest_framework_simplejwt.token_blacklist.models import OutstandingToken
        # OutstandingToken.objects.filter(user=user).update(...)

        tokens = _issue_tokens(user)
        return Response({
            'detail': 'Password reset successfully.',
            'user': UserDetailSerializer(user).data,
            **tokens,
        })


# ── UserViewSet ───────────────────────────────────────────────────────────────

class UserViewSet(viewsets.ModelViewSet):
    queryset = CustomUser.objects.all()
    serializer_class = UserSerializer

    # Actions that are publicly accessible (no login required)
    _PUBLIC_ACTIONS = frozenset({'create', 'list', 'retrieve', 'featured_tutors', 'site_stats', 'courses', 'reviews'})

    def get_permissions(self):
        if self.action in self._PUBLIC_ACTIONS:
            return [AllowAny()]
        return [IsAuthenticated()]

    def perform_destroy(self, instance):
        from rest_framework.exceptions import PermissionDenied
        if instance != self.request.user and self.request.user.role != 'admin':
            raise PermissionDenied('You can only delete your own account.')
        instance.delete()

    def get_serializer_class(self):
        if self.action in ['retrieve', 'profile', 'update', 'partial_update']:
            return UserDetailSerializer
        return UserSerializer

    # ── profile ──
    @action(detail=False, methods=['get', 'patch'])
    def profile(self, request):
        if request.method == 'PATCH':
            s = UserDetailSerializer(request.user, data=request.data, partial=True)
            s.is_valid(raise_exception=True)
            s.save()
            return Response(s.data)
        return Response(UserDetailSerializer(request.user).data)

    @action(detail=False, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def upload_avatar(self, request):
        if 'profile_picture' not in request.FILES:
            return Response({'detail': 'No file provided.'}, status=400)
        request.user.profile_picture = request.FILES['profile_picture']
        request.user.save(update_fields=['profile_picture'])
        return Response(UserDetailSerializer(request.user).data)

    # ── courses ──
    @action(detail=True, methods=['get'])
    def courses(self, request, pk=None):
        from apps.courses.models import Course
        from apps.courses.serializers import CourseSerializer
        user = self.get_object()
        qs = Course.objects.filter(tutor=user, is_published=True)
        return Response(CourseSerializer(qs, many=True, context={'request': request}).data)

    # ── reviews received (works for tutors via course reviews) ──
    @action(detail=True, methods=['get'])
    def reviews(self, request, pk=None):
        from apps.ratings.models import Review
        from apps.ratings.serializers import ReviewSerializer
        user = self.get_object()
        # Reviews left on courses owned by this tutor
        course_reviews = Review.objects.filter(course__tutor=user).order_by('-created_at')
        return Response(ReviewSerializer(course_reviews, many=True).data)

    # ── my_reviews shortcut for logged-in tutor ──
    @action(detail=False, methods=['get'])
    def my_reviews(self, request):
        from apps.ratings.models import Review
        from apps.ratings.serializers import ReviewSerializer
        reviews = Review.objects.filter(
            course__tutor=request.user
        ).select_related('reviewer', 'course').order_by('-created_at')[:20]
        return Response(ReviewSerializer(reviews, many=True).data)

    # ── featured tutors (for landing page) ──
    @action(detail=False, methods=['get'])
    def featured_tutors(self, request):
        tutors = (
            CustomUser.objects
            .filter(role__in=('tutor', 'teacher'), is_active=True, email_verified=True)
            .order_by('-total_students', '-average_rating')[:6]
        )
        return Response(UserSerializer(tutors, many=True).data)

    # ── site-wide stats (for landing page) ──
    @action(detail=False, methods=['get'])
    def site_stats(self, request):
        from apps.courses.models import Course
        from apps.ratings.models import Review
        return Response({
            'total_courses': Course.objects.filter(is_published=True).count(),
            'total_students': CustomUser.objects.filter(role='student').count(),
            'total_tutors': CustomUser.objects.filter(role__in=('tutor', 'teacher')).count(),
            'total_reviews': Review.objects.count(),
        })
