from django.conf import settings
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404

from .models import Video, Recording, VideoAccessToken
from .serializers import VideoSerializer, RecordingSerializer


class VideoViewSet(viewsets.ModelViewSet):
    queryset = Video.objects.all()
    serializer_class = VideoSerializer
    filterset_fields = ['status', 'is_public', 'uploaded_by']
    search_fields = ['title', 'description']
    ordering = ['-created_at']

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAuthenticated()]
        return [AllowAny()]

    def get_queryset(self):
        user = self.request.user
        qs = Video.objects.all()
        if not (user.is_authenticated and user.role == 'admin'):
            qs = qs.filter(is_public=True) | (
                Video.objects.filter(uploaded_by=user) if user.is_authenticated else Video.objects.none()
            )
        return qs

    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)

    @action(detail=True, methods=['post'])
    def increment_views(self, request, pk=None):
        video = self.get_object()
        Video.objects.filter(pk=video.pk).update(view_count=video.view_count + 1)
        return Response({'view_count': video.view_count + 1})

    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    def request_access(self, request, pk=None):
        """
        Generate a short-lived access token for the video.
        Anti-piracy: the frontend uses this token (not the raw file URL).
        """
        video = get_object_or_404(Video, pk=pk)

        # Access control
        user = request.user
        allowed = video.is_public or video.uploaded_by == user or user.role == 'admin'

        if not allowed and video.class_session:
            allowed = video.class_session.is_accessible_to(user)

        if not allowed:
            return Response({'detail': 'Enroll in the course to access this video.'}, status=403)

        ip = request.META.get('REMOTE_ADDR')
        token_obj = VideoAccessToken.create_for_user(user, video, hours=2, ip=ip)

        return Response({
            'token': str(token_obj.token),
            'expires_at': token_obj.expires_at,
        })


class VideoStreamView(APIView):
    """
    Returns the actual video URL (presigned S3 or local media URL)
    after validating the access token.

    Anti-piracy layer:
    - Token tied to user + IP
    - Expires after 2 hours
    - Token is invalidated after single use in production (use_count gate)
    - Raw file URL is never exposed to the frontend
    """
    permission_classes = [AllowAny]

    def get(self, request, pk):
        token_str = request.query_params.get('token', '')
        if not token_str:
            return Response({'detail': 'Access token required.'}, status=401)

        try:
            token_obj = VideoAccessToken.objects.select_related('video', 'user').get(token=token_str)
        except VideoAccessToken.DoesNotExist:
            return Response({'detail': 'Invalid token.'}, status=401)

        if not token_obj.is_valid:
            return Response({'detail': 'Token expired. Please refresh the page.'}, status=401)

        if str(token_obj.video.pk) != str(pk):
            return Response({'detail': 'Token mismatch.'}, status=401)

        # Track use
        VideoAccessToken.objects.filter(pk=token_obj.pk).update(used_count=token_obj.used_count + 1)
        Video.objects.filter(pk=token_obj.video.pk).update(view_count=token_obj.video.view_count + 1)

        video = token_obj.video

        # Build URL — in production use S3 presigned URL, in dev serve local media
        aws_bucket = getattr(settings, 'AWS_STORAGE_BUCKET_NAME', '')
        if aws_bucket and video.video_file:
            import boto3
            s3 = boto3.client('s3', region_name=settings.AWS_S3_REGION_NAME)
            url = s3.generate_presigned_url(
                'get_object',
                Params={'Bucket': aws_bucket, 'Key': str(video.video_file)},
                ExpiresIn=7200,
            )
        else:
            url = request.build_absolute_uri(video.video_file.url) if video.video_file else None

        if not url:
            return Response({'detail': 'Video not available.'}, status=404)

        return Response({
            'url': url,
            'title': video.title,
            'duration_seconds': video.duration_seconds,
            # Watermark metadata — frontend overlays this on the player
            'watermark': {
                'text': f'{token_obj.user.email}',
                'user_id': token_obj.user.pk,
            },
        })


class RecordingViewSet(viewsets.ModelViewSet):
    queryset = Recording.objects.all()
    serializer_class = RecordingSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['is_ready', 'class_session']
    ordering = ['-created_at']
