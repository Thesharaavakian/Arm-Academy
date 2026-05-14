from rest_framework import serializers
from .models import Video, Recording


class VideoSerializer(serializers.ModelSerializer):
    uploader_name = serializers.CharField(source='uploaded_by.get_full_name', read_only=True)

    class Meta:
        model = Video
        fields = [
            'id', 'title', 'description', 'video_file', 'duration_seconds',
            'file_size_mb', 'thumbnail', 'status', 'uploaded_by', 'uploader_name',
            'class_session', 'is_public', 'view_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'uploaded_by', 'created_at', 'updated_at', 'view_count']


class RecordingSerializer(serializers.ModelSerializer):
    class_title = serializers.CharField(source='class_session.title', read_only=True)
    video_data = VideoSerializer(source='video', read_only=True)

    class Meta:
        model = Recording
        fields = [
            'id', 'class_session', 'class_title', 'video', 'video_data',
            'started_at', 'ended_at', 'is_ready', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
