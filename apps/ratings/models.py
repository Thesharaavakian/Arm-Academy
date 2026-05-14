from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from apps.users.models import CustomUser
from apps.courses.models import Course, Class


class Review(models.Model):
    """
    Reviews and ratings for tutors and courses
    """
    # For either a tutor/teacher or a course
    tutor = models.ForeignKey(
        CustomUser, on_delete=models.CASCADE, related_name='tutor_reviews',
        null=True, blank=True, limit_choices_to={'role__in': ['tutor', 'teacher']},
    )
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='reviews', null=True, blank=True)

    # Reviewer
    reviewer = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='reviews_written')

    # Content
    title = models.CharField(max_length=255, blank=True, null=True)
    comment = models.TextField()
    rating = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )

    # Metadata
    is_verified = models.BooleanField(default=False)  # User has taken the course
    helpful_count = models.IntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        target = self.tutor or self.course
        return f"Review by {self.reviewer.username} for {target}"


class Progress(models.Model):
    """
    Track student progress in courses
    """
    student = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='progress_records')
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='student_progress')

    # Completion
    total_classes = models.IntegerField(default=0)
    attended_classes = models.IntegerField(default=0)
    completion_percentage = models.FloatField(default=0)

    # Timestamps
    started_at = models.DateTimeField(auto_now_add=True)
    last_accessed = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    is_completed = models.BooleanField(default=False)

    class Meta:
        unique_together = ('student', 'course')

    def __str__(self):
        return f"{self.student.username} in {self.course.title}"


class Attendance(models.Model):
    """
    Track attendance in classes
    """
    STATUS_CHOICES = [
        ('present', 'Present'),
        ('absent', 'Absent'),
        ('late', 'Late'),
        ('excused', 'Excused'),
    ]

    student = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='attendance_records')
    class_session = models.ForeignKey(Class, on_delete=models.CASCADE, related_name='attendance')

    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    notes = models.TextField(blank=True, null=True)

    recorded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('student', 'class_session')

    def __str__(self):
        return f"{self.student.username} - {self.class_session.title} ({self.status})"


class Certificate(models.Model):
    """
    Certificates for course completion
    """
    student = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='certificates')
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='certificates')

    certificate_number = models.CharField(max_length=100, unique=True)
    issue_date = models.DateTimeField(auto_now_add=True)

    # Verification
    is_valid = models.BooleanField(default=True)

    class Meta:
        unique_together = ('student', 'course')

    def __str__(self):
        return f"Certificate for {self.student.username} - {self.course.title}"
