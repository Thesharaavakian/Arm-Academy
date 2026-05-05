from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.validators import MinValueValidator, MaxValueValidator


class CustomUser(AbstractUser):
    """
    Custom user model supporting Students, Tutors, and Teachers
    """
    ROLE_CHOICES = [
        ('student', 'Student'),
        ('tutor', 'Tutor'),
        ('teacher', 'Teacher'),
        ('admin', 'Admin'),
    ]
    
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='student')
    bio = models.TextField(blank=True, null=True, help_text='User biography (Armenian)')
    profile_picture = models.ImageField(upload_to='profile_pictures/', null=True, blank=True)
    is_verified = models.BooleanField(default=False)
    
    # For tutors/teachers
    expertise_areas = models.CharField(max_length=500, blank=True, null=True, help_text='Comma-separated list of expertise areas (Armenian)')
    hourly_rate = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    average_rating = models.FloatField(
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(5)]
    )
    total_reviews = models.IntegerField(default=0)
    total_students = models.IntegerField(default=0)
    
    # Contact info
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.get_full_name() or self.username} ({self.role})"
    
    @property
    def is_tutor(self):
        return self.role in ['tutor', 'teacher']
    
    @property
    def is_student(self):
        return self.role == 'student'
