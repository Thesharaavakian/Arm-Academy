from django.db import models
from apps.users.models import CustomUser
from apps.courses.models import Course


class Payment(models.Model):
    STATUS_CHOICES = [
        ('pending',   'Pending'),
        ('completed', 'Completed'),
        ('failed',    'Failed'),
        ('refunded',  'Refunded'),
    ]

    student    = models.ForeignKey(CustomUser, on_delete=models.PROTECT, related_name='payments')
    course     = models.ForeignKey(Course,     on_delete=models.PROTECT, related_name='payments')
    amount_amd = models.DecimalField(max_digits=12, decimal_places=2)
    status     = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')

    # Stripe identifiers (blank if paying manually / without Stripe)
    stripe_checkout_session_id = models.CharField(max_length=255, blank=True)
    stripe_payment_intent_id   = models.CharField(max_length=255, blank=True)

    notes      = models.TextField(blank=True)  # admin notes / manual payment details
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        # Allow multiple attempts; uniqueness enforced at view level on active payments
        indexes = [models.Index(fields=['student', 'course', 'status'])]

    def __str__(self):
        return f'{self.student.username} → {self.course.title} [{self.status}]'

    @property
    def is_paid(self):
        return self.status == 'completed'
