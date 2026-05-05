from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.db.models import F
from .models import Course, Class
from .serializers import CourseSerializer, ClassSerializer, ClassDetailSerializer


class CourseViewSet(viewsets.ModelViewSet):
    queryset = Course.objects.filter(is_published=True)
    serializer_class = CourseSerializer
    permission_classes = [AllowAny]
    filterset_fields = ['tutor', 'level', 'is_published', 'is_free']
    search_fields = ['title', 'description', 'category']
    ordering_fields = ['created_at', 'total_students', 'average_rating']
    ordering = ['-created_at']

    def get_queryset(self):
        qs = Course.objects.all()
        if self.request.user.is_authenticated and self.action in ['update', 'partial_update', 'destroy']:
            return qs.filter(tutor=self.request.user)
        return qs.filter(is_published=True)

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated()]
        return [AllowAny()]

    def perform_create(self, serializer):
        serializer.save(tutor=self.request.user)

    @action(detail=True, methods=['get'])
    def classes(self, request, pk=None):
        course = self.get_object()
        classes = Class.objects.filter(course=course).order_by('scheduled_start')
        return Response(ClassSerializer(classes, many=True).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def enroll(self, request, pk=None):
        from apps.ratings.models import Progress
        from apps.ratings.serializers import ProgressSerializer
        course = self.get_object()
        user = request.user

        if Progress.objects.filter(student=user, course=course).exists():
            return Response({'detail': 'Already enrolled in this course.'}, status=status.HTTP_400_BAD_REQUEST)

        total_classes = Class.objects.filter(course=course).count()
        progress = Progress.objects.create(
            student=user,
            course=course,
            total_classes=total_classes,
        )
        Course.objects.filter(pk=course.pk).update(total_students=F('total_students') + 1)

        try:
            from apps.courses.tasks import send_enrollment_confirmation
            send_enrollment_confirmation.delay(user.email, course.title)
        except Exception:
            pass

        return Response({
            'detail': 'Successfully enrolled.',
            'progress': ProgressSerializer(progress).data,
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def unenroll(self, request, pk=None):
        from apps.ratings.models import Progress
        course = self.get_object()
        deleted, _ = Progress.objects.filter(student=request.user, course=course).delete()
        if deleted:
            Course.objects.filter(pk=course.pk).update(total_students=F('total_students') - 1)
            return Response({'detail': 'Unenrolled successfully.'})
        return Response({'detail': 'Not enrolled in this course.'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'])
    def reviews(self, request, pk=None):
        from apps.ratings.models import Review
        from apps.ratings.serializers import ReviewSerializer
        course = self.get_object()
        return Response(ReviewSerializer(course.reviews.all(), many=True).data)


class ClassViewSet(viewsets.ModelViewSet):
    queryset = Class.objects.all()
    serializer_class = ClassSerializer
    permission_classes = [AllowAny]
    filterset_fields = ['course', 'class_type', 'status']
    search_fields = ['title', 'description', 'course__title']
    ordering_fields = ['scheduled_start', 'created_at']
    ordering = ['scheduled_start']

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ClassDetailSerializer
        return ClassSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated()]
        return [AllowAny()]

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def attendance(self, request, pk=None):
        from apps.ratings.models import Attendance
        from apps.ratings.serializers import AttendanceSerializer
        class_session = self.get_object()
        attendance, created = Attendance.objects.get_or_create(
            student=request.user,
            class_session=class_session,
            defaults={'status': request.data.get('status', 'present')},
        )
        return Response(
            AttendanceSerializer(attendance).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    @action(detail=True, methods=['get'])
    def chat(self, request, pk=None):
        from apps.messaging.serializers import ClassChatSerializer
        class_session = self.get_object()
        return Response(ClassChatSerializer(class_session.chat_messages.all(), many=True).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def chat_post(self, request, pk=None):
        from apps.messaging.models import ClassChat
        from apps.messaging.serializers import ClassChatSerializer
        class_session = self.get_object()
        message = ClassChat.objects.create(
            class_session=class_session,
            sender=request.user,
            content=request.data.get('content', ''),
        )
        return Response(ClassChatSerializer(message).data, status=status.HTTP_201_CREATED)
