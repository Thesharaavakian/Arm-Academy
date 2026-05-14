from datetime import date
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.db.models import F
from .models import Course, Class, Section
from .serializers import CourseSerializer, ClassSerializer, ClassDetailSerializer, SectionSerializer
from apps.users.permissions import IsTutor, IsCourseOwnerOrReadOnly


def _fire(task, *args):
    """Dispatch a Celery task, silently drop if broker is unavailable."""
    try:
        task.delay(*args)
    except Exception:
        pass


class CourseViewSet(viewsets.ModelViewSet):
    serializer_class = CourseSerializer
    filterset_fields = ['tutor', 'level', 'is_published', 'is_free', 'category']
    search_fields = ['title', 'description', 'category']
    ordering_fields = ['created_at', 'total_students', 'average_rating']
    ordering = ['-created_at']

    def get_queryset(self):
        user = self.request.user
        # Tutors can see their own unpublished courses
        if self.action in ('update', 'partial_update', 'destroy', 'my_courses'):
            if user.is_authenticated and user.is_tutor:
                return Course.objects.filter(tutor=user)
        return Course.objects.filter(is_published=True)

    def get_permissions(self):
        if self.action in ('create', 'my_courses', 'publish', 'unpublish', 'students'):
            return [IsAuthenticated(), IsTutor()]
        if self.action in ('update', 'partial_update', 'destroy'):
            return [IsAuthenticated(), IsTutor(), IsCourseOwnerOrReadOnly()]
        if self.action == 'enroll':
            return [IsAuthenticated()]
        return [AllowAny()]

    def perform_create(self, serializer):
        serializer.save(tutor=self.request.user)

    # ── featured (for landing page) ──────────────────────────────────────
    @action(detail=False, methods=['get'])
    def featured(self, request):
        qs = (
            Course.objects
            .filter(is_published=True)
            .order_by('-average_rating', '-total_students')[:6]
        )
        return Response(CourseSerializer(qs, many=True, context={'request': request}).data)

    # ── tutor's own courses (dashboard) ──────────────────────────────────
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated, IsTutor])
    def my_courses(self, request):
        qs = Course.objects.filter(tutor=request.user).order_by('-created_at')
        return Response(CourseSerializer(qs, many=True, context={'request': request}).data)

    # ── submit for review (was publish) ───────────────────────────────────
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsTutor])
    def publish(self, request, pk=None):
        """
        Tutors no longer publish directly.
        Calling publish submits the course for admin moderation.
        It goes live only after admin approval.
        """
        course = self.get_object()
        if course.tutor != request.user and request.user.role != 'admin':
            return Response({'detail': 'Not your course.'}, status=403)

        if course.moderation_status == 'pending_review':
            return Response({'detail': 'Already submitted for review.'})

        if course.moderation_status == 'approved':
            # Re-publish a previously approved course (e.g. after unpublish)
            course.is_published = True
            course.save(update_fields=['is_published'])
        else:
            course.submit_for_review()

        return Response({
            'detail': 'Submitted for review. You will be notified once approved.',
            'moderation_status': course.moderation_status,
        })

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsTutor])
    def unpublish(self, request, pk=None):
        course = self.get_object()
        if course.tutor != request.user:
            return Response({'detail': 'Not your course.'}, status=403)
        course.is_published = False
        course.save(update_fields=['is_published'])
        return Response(CourseSerializer(course, context={'request': request}).data)

    # ── sections ───────────────────────────────────────────────────────────
    @action(detail=True, methods=['get'])
    def sections(self, request, pk=None):
        course = self.get_object()
        sections = Section.objects.filter(course=course).prefetch_related('classes')
        data = []
        for s in sections:
            sec_data = SectionSerializer(s).data
            sec_data['classes'] = ClassSerializer(
                s.classes.all(), many=True, context={'request': request}
            ).data
            data.append(sec_data)
        return Response(data)

    # ── classes ────────────────────────────────────────────────────────────
    @action(detail=True, methods=['get'])
    def classes(self, request, pk=None):
        course = self.get_object()
        qs = Class.objects.filter(course=course).order_by('order', 'scheduled_start')
        return Response(ClassSerializer(qs, many=True, context={'request': request}).data)

    # ── enroll ─────────────────────────────────────────────────────────────
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def enroll(self, request, pk=None):
        from apps.ratings.models import Progress
        from apps.ratings.serializers import ProgressSerializer
        course = self.get_object()
        user = request.user

        if Progress.objects.filter(student=user, course=course).exists():
            return Response({'detail': 'Already enrolled.'}, status=400)

        # 18+ content gate — verify user age
        if course.content_rating == 'adult':
            dob = getattr(user, 'date_of_birth', None)
            if dob:
                from dateutil.relativedelta import relativedelta
                age = relativedelta(date.today(), dob).years
                if age < 18:
                    return Response({
                        'detail': 'This course is restricted to users 18 and older.',
                        'requires_age_verification': True,
                    }, status=403)
            else:
                return Response({
                    'detail': 'Please verify your age to access 18+ content.',
                    'requires_age_verification': True,
                }, status=403)

        # Gate paid courses — require a completed payment
        if not course.is_free and course.price_amd:
            from apps.payments.models import Payment
            has_paid = Payment.objects.filter(
                student=user, course=course, status='completed'
            ).exists()
            if not has_paid:
                return Response({
                    'detail': 'This course requires payment before enrolling.',
                    'requires_payment': True,
                    'price_amd': str(course.price_amd),
                    'course_id': course.pk,
                }, status=402)  # 402 Payment Required

        progress = Progress.objects.create(
            student=user, course=course,
            total_classes=Class.objects.filter(course=course).count(),
        )
        Course.objects.filter(pk=course.pk).update(total_students=F('total_students') + 1)
        new_total = course.total_students + 1  # no extra SELECT needed

        from apps.courses.tasks import send_enrollment_confirmation
        from apps.users.tasks import notify_tutor_new_enrollment_task
        _fire(send_enrollment_confirmation, user.email, course.title)
        _fire(notify_tutor_new_enrollment_task,
              course.tutor.email, course.tutor.display_name,
              user.display_name, course.title, new_total)

        return Response({
            'detail': 'Enrolled successfully.',
            'progress': ProgressSerializer(progress).data,
        }, status=201)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def unenroll(self, request, pk=None):
        from apps.ratings.models import Progress
        course = self.get_object()
        deleted, _ = Progress.objects.filter(student=request.user, course=course).delete()
        if deleted:
            Course.objects.filter(pk=course.pk).update(total_students=F('total_students') - 1)
            return Response({'detail': 'Unenrolled.'})
        return Response({'detail': 'Not enrolled.'}, status=400)

    # ── students (tutor-only view of who enrolled) ─────────────────────────
    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    def students(self, request, pk=None):
        from apps.ratings.models import Progress
        course = self.get_object()
        if course.tutor != request.user and request.user.role != 'admin':
            return Response({'detail': 'Only the course owner can view students.'}, status=403)
        qs = Progress.objects.filter(course=course).select_related('student').order_by('-started_at')
        data = [
            {
                'id':                  p.student.id,
                'display_name':        p.student.display_name,
                'email':               p.student.email,
                'profile_picture':     p.student.profile_picture.url if p.student.profile_picture else None,
                'completion_percentage': p.completion_percentage,
                'attended_classes':    p.attended_classes,
                'total_classes':       p.total_classes,
                'is_completed':        p.is_completed,
                'enrolled_at':         p.started_at,
            }
            for p in qs
        ]
        return Response({'count': len(data), 'students': data})

    # ── reviews ────────────────────────────────────────────────────────────
    @action(detail=True, methods=['get'])
    def reviews(self, request, pk=None):
        from apps.ratings.models import Review
        from apps.ratings.serializers import ReviewSerializer
        course = self.get_object()
        qs = Review.objects.filter(course=course).order_by('-helpful_count', '-created_at')
        return Response(ReviewSerializer(qs, many=True).data)


class ClassViewSet(viewsets.ModelViewSet):
    queryset = Class.objects.all()
    serializer_class = ClassSerializer
    filterset_fields = ['course', 'class_type', 'status']
    search_fields = ['title', 'description', 'course__title']
    ordering_fields = ['scheduled_start', 'created_at']
    ordering = ['scheduled_start']

    def get_serializer_class(self):
        return ClassDetailSerializer if self.action == 'retrieve' else ClassSerializer

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAuthenticated(), IsTutor()]
        if self.action == 'my_upcoming':
            return [IsAuthenticated()]
        return [AllowAny()]

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def my_upcoming(self, request):
        """Scheduled classes for the courses the current student is enrolled in."""
        from apps.ratings.models import Progress
        enrolled_ids = Progress.objects.filter(
            student=request.user
        ).values_list('course_id', flat=True)

        classes = (
            Class.objects.filter(
                course_id__in=enrolled_ids,
                status='scheduled',
            )
            .select_related('course', 'course__tutor')
            .order_by('scheduled_start')[:8]
        )
        return Response(ClassSerializer(classes, many=True).data)

    def perform_create(self, serializer):
        # Ensure the course belongs to the requesting tutor
        course = serializer.validated_data['course']
        if course.tutor != self.request.user and self.request.user.role != 'admin':
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('You do not own this course.')
        serializer.save()

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def attendance(self, request, pk=None):
        from apps.ratings.models import Attendance
        from apps.ratings.serializers import AttendanceSerializer
        cls = self.get_object()
        att, created = Attendance.objects.get_or_create(
            student=request.user, class_session=cls,
            defaults={'status': request.data.get('status', 'present')},
        )
        return Response(AttendanceSerializer(att).data, status=201 if created else 200)

    @action(detail=True, methods=['get'])
    def chat(self, request, pk=None):
        from apps.messaging.serializers import ClassChatSerializer
        cls = self.get_object()
        return Response(ClassChatSerializer(cls.chat_messages.all(), many=True).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def chat_post(self, request, pk=None):
        from apps.messaging.models import ClassChat
        from apps.messaging.serializers import ClassChatSerializer
        cls = self.get_object()
        msg = ClassChat.objects.create(
            class_session=cls, sender=request.user, content=request.data.get('content', '')
        )
        return Response(ClassChatSerializer(msg).data, status=201)


class SectionViewSet(viewsets.ModelViewSet):
    queryset = Section.objects.all()
    serializer_class = SectionSerializer
    filterset_fields = ['course']
    ordering = ['order']

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAuthenticated(), IsTutor()]
        return [AllowAny()]

    def perform_create(self, serializer):
        course = serializer.validated_data['course']
        if course.tutor != self.request.user and self.request.user.role != 'admin':
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('You do not own this course.')
        serializer.save()
