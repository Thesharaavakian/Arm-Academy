from django.db import models
from django.core.validators import FileExtensionValidator
from apps.users.models import CustomUser
from apps.courses.models import Class


class Video(models.Model):
    """
    Video file management for courses and classes
    """
    STATUS_CHOICES = [
        ('uploading', 'Uploading'),
        ('processing', 'Processing'),
        ('ready', 'Ready'),
        ('failed', 'Failed'),
    ]
    
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    
    # File
    video_file = models.FileField(
        upload_to='videos/%Y/%m/%d/',
        validators=[FileExtensionValidator(allowed_extensions=['mp4', 'avi', 'mov', 'mkv', 'webm'])]
    )
    
    # Metadata
    duration_seconds = models.IntegerField(null=True, blank=True)  # Video length in seconds
    file_size_mb = models.FloatField(null=True, blank=True)
    
    thumbnail = models.ImageField(upload_to='video_thumbnails/', null=True, blank=True)
    
    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='uploading')
    
    # Uploader
    uploaded_by = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    
    # Associated content
    class_session = models.OneToOneField(Class, on_delete=models.CASCADE, related_name='video', null=True, blank=True)
    
    # Access control
    is_public = models.BooleanField(default=False)
    
    # Engagement
    view_count = models.IntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return self.title


class Recording(models.Model):
    """
    Automatic recording of live classes
    """
    class_session = models.OneToOneField(Class, on_delete=models.CASCADE, related_name='recording')
    video = models.OneToOneField(Video, on_delete=models.SET_NULL, null=True, blank=True)
    
    # Recording metadata
    started_at = models.DateTimeField()
    ended_at = models.DateTimeField(null=True, blank=True)
    
    # Status
    is_ready = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Recording of {self.class_session.title}"
