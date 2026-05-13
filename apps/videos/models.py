import uuid
from datetime import timedelta
from django.db import models
from django.core.validators import FileExtensionValidator
from django.utils import timezone
from apps.users.models import CustomUser
from apps.courses.models import Class


class Video(models.Model):
    STATUS_CHOICES = [
        ('uploading',   'Uploading'),
        ('processing',  'Processing'),
        ('ready',       'Ready'),
        ('failed',      'Failed'),
    ]

    title       = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)

    video_file = models.FileField(
        upload_to='videos/%Y/%m/%d/',
        validators=[FileExtensionValidator(allowed_extensions=['mp4', 'avi', 'mov', 'mkv', 'webm'])],
    )

    duration_seconds = models.IntegerField(null=True, blank=True)
    file_size_mb     = models.FloatField(null=True, blank=True)
    thumbnail        = models.ImageField(upload_to='video_thumbnails/', null=True, blank=True)

    status      = models.CharField(max_length=20, choices=STATUS_CHOICES, default='uploading')
    uploaded_by = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    class_session = models.OneToOneField(Class, on_delete=models.CASCADE, related_name='video', null=True, blank=True)

    # Public videos are visible without enrollment (e.g. free preview)
    is_public   = models.BooleanField(default=False)
    view_count  = models.IntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title


class VideoAccessToken(models.Model):
    """
    Short-lived token granting a specific user access to a video.
    Prevents URL sharing / piracy by tying access to a user + expiry.
    """
    user       = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='video_tokens')
    video      = models.ForeignKey(Video, on_delete=models.CASCADE, related_name='access_tokens')
    token      = models.UUIDField(default=uuid.uuid4, unique=True, db_index=True)
    expires_at = models.DateTimeField()
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    used_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'Token for {self.user.username} → {self.video.title}'

    @classmethod
    def create_for_user(cls, user, video, hours=2, ip=None):
        # Invalidate existing tokens for this user+video
        cls.objects.filter(user=user, video=video).delete()
        return cls.objects.create(
            user=user, video=video, ip_address=ip,
            expires_at=timezone.now() + timedelta(hours=hours),
        )

    @property
    def is_valid(self):
        return timezone.now() < self.expires_at


class Recording(models.Model):
    class_session = models.OneToOneField(Class, on_delete=models.CASCADE, related_name='recording')
    video         = models.OneToOneField(Video, on_delete=models.SET_NULL, null=True, blank=True)
    started_at    = models.DateTimeField()
    ended_at      = models.DateTimeField(null=True, blank=True)
    is_ready      = models.BooleanField(default=False)
    created_at    = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'Recording of {self.class_session.title}'
