from celery import shared_task
from django.core.mail import send_mail


@shared_task(bind=True, max_retries=3)
def send_enrollment_confirmation(self, user_email, course_title):
    try:
        send_mail(
            subject=f'Enrolled in "{course_title}" — Arm Academy',
            message=(
                f'You have successfully enrolled in "{course_title}".\n\n'
                'Visit your dashboard to start learning.\n\n'
                'Arm Academy Team'
            ),
            from_email='noreply@armacademy.am',
            recipient_list=[user_email],
            fail_silently=False,
        )
    except Exception as exc:
        raise self.retry(exc=exc, countdown=60)


@shared_task(bind=True, max_retries=3)
def update_course_stats(self, course_id):
    try:
        from apps.courses.models import Course
        from apps.ratings.models import Review, Progress
        from django.db.models import Avg, Count

        course = Course.objects.get(pk=course_id)
        stats = Review.objects.filter(course=course).aggregate(
            avg_rating=Avg('rating'),
            total=Count('id'),
        )
        course.average_rating = stats['avg_rating'] or 0
        course.total_reviews = stats['total']
        course.total_students = Progress.objects.filter(course=course).count()
        course.save(update_fields=['average_rating', 'total_reviews', 'total_students'])
    except Exception as exc:
        raise self.retry(exc=exc, countdown=30)
