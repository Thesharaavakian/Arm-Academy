import random
from datetime import timedelta
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone


def _generate_otp():
    return str(random.randint(100000, 999999))


class CustomUser(AbstractUser):
    ROLE_CHOICES = [
        ('student', 'Student'),
        ('tutor', 'Tutor'),
        ('teacher', 'Teacher'),
        ('admin', 'Admin'),
    ]

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='student')
    bio = models.TextField(blank=True, null=True)
    profile_picture = models.ImageField(upload_to='profile_pictures/', null=True, blank=True)
    is_verified = models.BooleanField(default=False)

    # Tutor/teacher stats
    expertise_areas = models.CharField(max_length=500, blank=True, null=True)
    hourly_rate = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    average_rating = models.FloatField(default=0, validators=[MinValueValidator(0), MaxValueValidator(5)])
    total_reviews = models.IntegerField(default=0)
    total_students = models.IntegerField(default=0)

    # Contact
    phone_number = models.CharField(max_length=20, blank=True, null=True)

    # Age & legal
    date_of_birth    = models.DateField(null=True, blank=True)
    accepted_terms_at = models.DateTimeField(null=True, blank=True)

    # Verification flags
    email_verified = models.BooleanField(default=False)
    phone_verified = models.BooleanField(default=False)

    # 2FA
    two_fa_enabled = models.BooleanField(default=False)
    totp_secret = models.CharField(max_length=64, blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.get_full_name() or self.username} ({self.role})"

    @property
    def display_name(self):
        return self.get_full_name() or self.username

    @property
    def is_tutor(self):
        return self.role in ['tutor', 'teacher']

    @property
    def is_student(self):
        return self.role == 'student'


class OTPVerification(models.Model):
    EMAIL = 'email'
    PHONE = 'phone'
    TYPE_CHOICES = [(EMAIL, 'Email OTP'), (PHONE, 'Phone OTP')]

    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='otp_verifications')
    otp_type = models.CharField(max_length=10, choices=TYPE_CHOICES)
    code = models.CharField(max_length=6)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    @classmethod
    def create_for_user(cls, user, otp_type, expires_minutes=15):
        cls.objects.filter(user=user, otp_type=otp_type, is_used=False).update(is_used=True)
        return cls.objects.create(
            user=user,
            otp_type=otp_type,
            code=_generate_otp(),
            expires_at=timezone.now() + timedelta(minutes=expires_minutes),
        )

    @property
    def is_valid(self):
        return not self.is_used and self.expires_at > timezone.now()

    def consume(self):
        self.is_used = True
        self.save(update_fields=['is_used'])

    def __str__(self):
        return f"OTP({self.otp_type}) for {self.user.email}"
