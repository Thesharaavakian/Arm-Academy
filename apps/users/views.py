import uuid
import io
import base64
from django.contrib.auth import authenticate
from django.core.cache import cache
from django.db.models import Avg, Count
from rest_framework import viewsets, generics, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError

from .models import CustomUser, OTPVerification
from .serializers import UserSerializer, UserDetailSerializer, UserRegistrationSerializer
from .permissions import IsTutor, IsEmailVerified


# ── helpers ──────────────────────────────────────────────────────────────────

def _issue_tokens(user):
    refresh = RefreshToken.for_user(user)
    refresh['role'] = user.role
    refresh['email'] = user.email
    refresh['full_name'] = user.display_name
    return {'access': str(refresh.access_token), 'refresh': str(refresh)}


def _send_email_otp(user):
    otp = OTPVerification.create_for_user(user, OTPVerification.EMAIL)
    from .tasks import send_email_otp_task
    send_email_otp_task.delay(user.email, otp.code, user.first_name)
    return otp


# ── Auth views ────────────────────────────────────────────────────────────────

class RegisterView(generics.CreateAPIView):
    queryset = CustomUser.objects.all()
    permission_classes = [AllowAny]
    serializer_class = UserRegistrationSerializer

    def create(self, request, *args, **kwargs):
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

    def post(self, request):
        identifier = request.data.get('username', '').strip()
        password = request.data.get('password', '')

        # Allow login with email or username
        user = authenticate(request, username=identifier, password=password)
        if not user:
            try:
                u = CustomUser.objects.get(email__iexact=identifier)
                user = authenticate(request, username=u.username, password=password)
            except CustomUser.DoesNotExist:
                pass

        if not user or not user.is_active:
            return Response({'detail': 'Invalid credentials.'}, status=status.HTTP_401_UNAUTHORIZED)

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
        from .tasks import send_phone_otp_task
        send_phone_otp_task.delay(phone, otp.code)
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


# ── UserViewSet ───────────────────────────────────────────────────────────────

class UserViewSet(viewsets.ModelViewSet):
    queryset = CustomUser.objects.all()
    serializer_class = UserSerializer

    def get_permissions(self):
        if self.action == 'create':
            return [AllowAny()]
        return [IsAuthenticated()]

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

    # ── reviews ──
    @action(detail=True, methods=['get'])
    def reviews(self, request, pk=None):
        from apps.ratings.models import Review
        from apps.ratings.serializers import ReviewSerializer
        user = self.get_object()
        return Response(ReviewSerializer(Review.objects.filter(tutor=user), many=True).data)

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
