import uuid
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone


@receiver(post_save, sender='ratings.Attendance')
def update_progress_on_attendance(sender, instance, created, **kwargs):
    """Recalculate progress and auto-issue certificate when a student marks attendance."""
    if not created:
        return

    from apps.courses.models import Class
    from .models import Attendance, Progress, Certificate

    course = instance.class_session.course
    student = instance.student

    progress, _ = Progress.objects.get_or_create(
        student=student,
        course=course,
        defaults={'total_classes': Class.objects.filter(course=course).count()},
    )

    # Recalculate
    total = Class.objects.filter(course=course).count()
    attended = Attendance.objects.filter(
        student=student,
        class_session__course=course,
        status__in=('present', 'late'),
    ).count()

    progress.total_classes = total
    progress.attended_classes = attended
    progress.last_accessed = timezone.now()
    progress.completion_percentage = round((attended / total * 100), 1) if total > 0 else 0

    if progress.completion_percentage >= 100 and not progress.is_completed:
        progress.is_completed = True
        progress.completed_at = timezone.now()
        _auto_issue_certificate(student, course)

    progress.save()

    # Keep course aggregate stats fresh
    try:
        from apps.courses.tasks import update_course_stats
        update_course_stats.delay(course.pk)
    except Exception:
        pass


def _auto_issue_certificate(student, course):
    from .models import Certificate
    cert_number = uuid.uuid4().hex.upper()[:20]
    Certificate.objects.get_or_create(
        student=student,
        course=course,
        defaults={
            'certificate_number': cert_number,
            'issue_date': timezone.now().date(),
            'is_valid': True,
        },
    )
    # Send email notification
    try:
        from apps.users.tasks import send_welcome_email_task
        send_welcome_email_task.delay(
            student.email,
            student.first_name,
            f'certificate for {course.title}',
        )
    except Exception:
        pass
