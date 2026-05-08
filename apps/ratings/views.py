from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from .models import Review, Progress, Attendance, Certificate
from .serializers import ReviewSerializer, ProgressSerializer, AttendanceSerializer, CertificateSerializer


class ReviewViewSet(viewsets.ModelViewSet):
    queryset = Review.objects.all()
    serializer_class = ReviewSerializer
    filterset_fields = ['tutor', 'course', 'reviewer', 'rating', 'is_verified']
    search_fields = ['comment', 'title']
    ordering_fields = ['created_at', 'rating', 'helpful_count']
    ordering = ['-helpful_count', '-created_at']

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy', 'mark_helpful'):
            return [IsAuthenticated()]
        return [AllowAny()]

    def get_queryset(self):
        qs = super().get_queryset()
        # Only show verified / non-spam reviews publicly
        if not self.request.user.is_authenticated or self.request.user.role != 'admin':
            qs = qs.filter(is_verified=True)
        return qs

    def perform_create(self, serializer):
        user = self.request.user
        course = serializer.validated_data.get('course')
        tutor = serializer.validated_data.get('tutor')

        # Enrollment check for course reviews
        if course:
            enrolled = Progress.objects.filter(student=user, course=course).exists()
            if not enrolled:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied('You must be enrolled in this course to leave a review.')

            # One review per student per course
            if Review.objects.filter(reviewer=user, course=course).exists():
                from rest_framework.exceptions import ValidationError
                raise ValidationError({'detail': 'You have already reviewed this course.'})

        serializer.save(reviewer=user, is_verified=True)

        # Trigger async stats update
        if course:
            try:
                from apps.courses.tasks import update_course_stats
                update_course_stats.delay(course.pk)
            except Exception:
                pass

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def mark_helpful(self, request, pk=None):
        review = self.get_object()
        review.helpful_count += 1
        review.save(update_fields=['helpful_count'])
        return Response(self.get_serializer(review).data)

    @action(detail=True, methods=['delete'], permission_classes=[IsAuthenticated])
    def remove(self, request, pk=None):
        review = self.get_object()
        if review.reviewer != request.user and request.user.role != 'admin':
            return Response({'detail': 'Not your review.'}, status=403)
        review.delete()
        return Response(status=204)


class ProgressViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ProgressSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['course', 'is_completed']
    ordering = ['-completion_percentage']

    def get_queryset(self):
        return Progress.objects.filter(student=self.request.user).select_related('course')


class AttendanceViewSet(viewsets.ModelViewSet):
    queryset = Attendance.objects.all()
    serializer_class = AttendanceSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['student', 'class_session', 'status']
    ordering = ['-recorded_at']


class CertificateViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = CertificateSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['course', 'is_valid']
    ordering = ['-issue_date']

    def get_queryset(self):
        return Certificate.objects.filter(student=self.request.user).select_related('course')
