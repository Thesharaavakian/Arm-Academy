from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from .models import Video, Recording
from .serializers import VideoSerializer, RecordingSerializer


class VideoViewSet(viewsets.ModelViewSet):
    queryset = Video.objects.all()
    serializer_class = VideoSerializer
    permission_classes = [AllowAny]
    filterset_fields = ['status', 'is_public', 'uploaded_by']
    search_fields = ['title', 'description']
    ordering_fields = ['created_at', 'view_count']
    ordering = ['-created_at']
    
    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)
    
    @action(detail=True, methods=['post'])
    def increment_views(self, request, pk=None):
        """Increment view count"""
        video = self.get_object()
        video.view_count += 1
        video.save()
        serializer = self.get_serializer(video)
        return Response(serializer.data)


class RecordingViewSet(viewsets.ModelViewSet):
    queryset = Recording.objects.all()
    serializer_class = RecordingSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['is_ready', 'class_session']
    ordering_fields = ['created_at', 'started_at']
    ordering = ['-created_at']
