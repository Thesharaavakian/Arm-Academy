from django.db import models
from django.utils import timezone
from apps.users.models import CustomUser


class Course(models.Model):
    """
    Course/Subject model
    """
    LEVEL_CHOICES = [
        ('beginner', 'Beginner'),
        ('intermediate', 'Intermediate'),
        ('advanced', 'Advanced'),
    ]
    
    title = models.CharField(max_length=255, help_text='Course title in Armenian')
    description = models.TextField(help_text='Course description in Armenian')
    tutor = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='courses', limit_choices_to={'role__in': ['tutor', 'teacher']})
    
    cover_image = models.ImageField(upload_to='course_covers/', null=True, blank=True)
    category = models.CharField(max_length=100, help_text='Course category in Armenian')
    level = models.CharField(max_length=20, choices=LEVEL_CHOICES, default='beginner')
    
    # Pricing (AMD — Armenian Dram)
    is_free = models.BooleanField(default=True)
    price_amd = models.DecimalField(
        max_digits=10, decimal_places=0, null=True, blank=True,
        help_text='Price in Armenian Dram (AMD). Leave blank if free.',
    )
    subscription_required = models.BooleanField(default=False)
    
    # Stats
    total_students = models.IntegerField(default=0)
    average_rating = models.FloatField(default=0)
    total_reviews = models.IntegerField(default=0)
    
    # Metadata
    is_published = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return self.title


class Class(models.Model):
    """
    Individual class/session within a course
    Supports: Live, Recorded, Chat-based, In-person
    """
    TYPE_CHOICES = [
        ('live', 'Live'),
        ('recorded', 'Recorded'),
        ('chat', 'Chat-based'),
        ('in_person', 'In-person'),
    ]
    
    STATUS_CHOICES = [
        ('scheduled', 'Scheduled'),
        ('ongoing', 'Ongoing'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='classes')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    
    class_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='live')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='scheduled')
    
    # Scheduling (optional — not all class types need a fixed time)
    scheduled_start = models.DateTimeField(null=True, blank=True)
    scheduled_end = models.DateTimeField(null=True, blank=True)
    duration_minutes = models.IntegerField(null=True, blank=True)
    
    # Location (for in-person)
    location = models.CharField(max_length=500, blank=True, null=True, help_text='Physical location for in-person classes')
    
    # Meeting details (for live classes)
    meeting_url = models.URLField(blank=True, null=True, help_text='Zoom/Stream URL')
    recording_link = models.URLField(blank=True, null=True, help_text='Recorded class URL')
    
    # Enrollment
    max_students = models.IntegerField(null=True, blank=True)
    enrolled_students = models.ManyToManyField(CustomUser, related_name='enrolled_classes', blank=True)
    enrolled_count = models.IntegerField(default=0)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['scheduled_start']
    
    def __str__(self):
        return f"{self.course.title} - {self.title}"
    
    def is_live_now(self):
        if not self.scheduled_start or not self.scheduled_end:
            return False
        now = timezone.now()
        return self.scheduled_start <= now <= self.scheduled_end
