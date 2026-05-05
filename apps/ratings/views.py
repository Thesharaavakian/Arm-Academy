from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from .models import Review, Progress, Attendance, Certificate
from .serializers import ReviewSerializer, ProgressSerializer, AttendanceSerializer, CertificateSerializer


class ReviewViewSet(viewsets.ModelViewSet):
    queryset = Review.objects.all()
    serializer_class = ReviewSerializer
    permission_classes = [AllowAny]
    filterset_fields = ['tutor', 'course', 'reviewer', 'rating', 'is_verified']
    search_fields = ['comment', 'title']
    ordering_fields = ['created_at', 'rating']
    ordering = ['-created_at']
    
    def perform_create(self, serializer):
        serializer.save(reviewer=self.request.user)
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def mark_helpful(self, request, pk=None):
        """Mark review as helpful"""
        review = self.get_object()
        review.helpful_count += 1
        review.save()
        serializer = self.get_serializer(review)
        return Response(serializer.data)


class ProgressViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Progress.objects.all()
    serializer_class = ProgressSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['student', 'course', 'is_completed']
    ordering_fields = ['created_at', 'completion_percentage']
    ordering = ['-completion_percentage']
    
    def get_queryset(self):
        return Progress.objects.filter(student=self.request.user)


class AttendanceViewSet(viewsets.ModelViewSet):
    queryset = Attendance.objects.all()
    serializer_class = AttendanceSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['student', 'class_session', 'status']
    ordering_fields = ['recorded_at']
    ordering = ['-recorded_at']


class CertificateViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Certificate.objects.all()
    serializer_class = CertificateSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['student', 'course', 'is_valid']
    ordering_fields = ['issue_date']
    ordering = ['-issue_date']
    
    def get_queryset(self):
        return Certificate.objects.filter(student=self.request.user)
