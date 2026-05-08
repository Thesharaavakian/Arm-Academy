from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.db.models import F
from .models import Course, Class
from .serializers import CourseSerializer, ClassSerializer, ClassDetailSerializer
from apps.users.permissions import IsTutor, IsCourseOwnerOrReadOnly


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
        if self.action in ('create',):
            return [IsAuthenticated(), IsTutor()]
        if self.action in ('update', 'partial_update', 'destroy'):
            return [IsAuthenticated(), IsTutor(), IsCourseOwnerOrReadOnly()]
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

    # ── publish / unpublish ────────────────────────────────────────────────
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsTutor])
    def publish(self, request, pk=None):
        course = self.get_object()
        if course.tutor != request.user:
            return Response({'detail': 'Not your course.'}, status=403)
        course.is_published = True
        course.save(update_fields=['is_published'])
        return Response(CourseSerializer(course, context={'request': request}).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsTutor])
    def unpublish(self, request, pk=None):
        course = self.get_object()
        if course.tutor != request.user:
            return Response({'detail': 'Not your course.'}, status=403)
        course.is_published = False
        course.save(update_fields=['is_published'])
        return Response(CourseSerializer(course, context={'request': request}).data)

    # ── classes ────────────────────────────────────────────────────────────
    @action(detail=True, methods=['get'])
    def classes(self, request, pk=None):
        course = self.get_object()
        qs = Class.objects.filter(course=course).order_by('scheduled_start')
        return Response(ClassSerializer(qs, many=True).data)

    # ── enroll ─────────────────────────────────────────────────────────────
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def enroll(self, request, pk=None):
        from apps.ratings.models import Progress
        from apps.ratings.serializers import ProgressSerializer
        course = self.get_object()
        user = request.user

        if Progress.objects.filter(student=user, course=course).exists():
            return Response({'detail': 'Already enrolled.'}, status=400)

        progress = Progress.objects.create(
            student=user, course=course,
            total_classes=Class.objects.filter(course=course).count(),
        )
        Course.objects.filter(pk=course.pk).update(total_students=F('total_students') + 1)

        try:
            from apps.courses.tasks import send_enrollment_confirmation
            send_enrollment_confirmation.delay(user.email, course.title)
        except Exception:
            pass

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
        return [AllowAny()]

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
