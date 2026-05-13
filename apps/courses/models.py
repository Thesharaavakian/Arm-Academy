import uuid
from django.db import models
from django.utils import timezone
from apps.users.models import CustomUser


# ── Course ─────────────────────────────────────────────────────────────────────

class Course(models.Model):
    LEVEL_CHOICES = [
        ('beginner',     'Beginner'),
        ('intermediate', 'Intermediate'),
        ('advanced',     'Advanced'),
    ]

    CONTENT_RATING_CHOICES = [
        ('general', 'General — All Ages'),
        ('teen',    'Teen (13+)'),
        ('mature',  'Mature (16+)'),
        ('adult',   '18+ Adults Only'),
    ]

    MODERATION_STATUS_CHOICES = [
        ('draft',          'Draft'),
        ('pending_review', 'Pending Review'),
        ('approved',       'Approved'),
        ('rejected',       'Rejected'),
        ('suspended',      'Suspended'),
    ]

    title       = models.CharField(max_length=255)
    description = models.TextField()
    tutor       = models.ForeignKey(
        CustomUser, on_delete=models.CASCADE, related_name='courses',
        limit_choices_to={'role__in': ['tutor', 'teacher']},
    )

    cover_image = models.ImageField(upload_to='course_covers/', null=True, blank=True)
    trailer_url = models.URLField(blank=True, null=True, help_text='Short preview/trailer video URL')
    category    = models.CharField(max_length=100)
    level       = models.CharField(max_length=20, choices=LEVEL_CHOICES, default='beginner')
    language    = models.CharField(max_length=50, default='Armenian')
    tags        = models.CharField(max_length=500, blank=True, help_text='Comma-separated tags')

    # Pricing (AMD)
    is_free      = models.BooleanField(default=True)
    price_amd    = models.DecimalField(max_digits=10, decimal_places=0, null=True, blank=True)
    subscription_required = models.BooleanField(default=False)

    # Stats (auto-maintained)
    total_students  = models.IntegerField(default=0)
    average_rating  = models.FloatField(default=0)
    total_reviews   = models.IntegerField(default=0)
    total_lectures  = models.IntegerField(default=0)
    total_duration_minutes = models.IntegerField(default=0)

    # Visibility
    is_published = models.BooleanField(default=False)

    # Content rating & moderation
    content_rating    = models.CharField(max_length=20, choices=CONTENT_RATING_CHOICES, default='general')
    moderation_status = models.CharField(max_length=20, choices=MODERATION_STATUS_CHOICES, default='draft')
    rejection_reason  = models.TextField(blank=True)
    moderated_by      = models.ForeignKey(
        CustomUser, null=True, blank=True, on_delete=models.SET_NULL, related_name='moderated_courses',
    )
    moderated_at      = models.DateTimeField(null=True, blank=True)

    # Requirements & what students learn
    requirements    = models.TextField(blank=True, help_text='Prerequisites for this course')
    what_you_learn  = models.TextField(blank=True, help_text='Bullet points of learning outcomes')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title

    @property
    def is_adult_content(self):
        return self.content_rating == 'adult'

    def submit_for_review(self):
        self.moderation_status = 'pending_review'
        self.save(update_fields=['moderation_status'])

    def approve(self, admin_user):
        self.moderation_status = 'approved'
        self.is_published = True
        self.moderated_by = admin_user
        self.moderated_at = timezone.now()
        self.rejection_reason = ''
        self.save(update_fields=['moderation_status', 'is_published', 'moderated_by', 'moderated_at', 'rejection_reason'])

    def reject(self, admin_user, reason=''):
        self.moderation_status = 'rejected'
        self.is_published = False
        self.moderated_by = admin_user
        self.moderated_at = timezone.now()
        self.rejection_reason = reason
        self.save(update_fields=['moderation_status', 'is_published', 'moderated_by', 'moderated_at', 'rejection_reason'])

    def suspend(self, admin_user, reason=''):
        self.moderation_status = 'suspended'
        self.is_published = False
        self.rejection_reason = reason
        self.save(update_fields=['moderation_status', 'is_published', 'rejection_reason'])


# ── Section (Udemy-style chapter grouping) ─────────────────────────────────────

class Section(models.Model):
    course      = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='sections')
    title       = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    order       = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order', 'id']

    def __str__(self):
        return f'{self.course.title} — {self.title}'


# ── Class (Lecture) ────────────────────────────────────────────────────────────

class Class(models.Model):
    TYPE_CHOICES = [
        ('live',      'Live Interactive Class'),
        ('recorded',  'Recorded / On-Demand'),
        ('chat',      'Chat-Based Session'),
        ('in_person', 'In-Person / Classroom'),
    ]

    STATUS_CHOICES = [
        ('scheduled', 'Scheduled'),
        ('ongoing',   'Ongoing'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]

    course  = models.ForeignKey(Course,  on_delete=models.CASCADE, related_name='classes')
    section = models.ForeignKey(Section, on_delete=models.SET_NULL, null=True, blank=True, related_name='classes')

    title       = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)

    class_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='live')
    status     = models.CharField(max_length=20, choices=STATUS_CHOICES, default='scheduled')
    order      = models.PositiveIntegerField(default=0)

    # Free preview — non-enrolled users can watch this lecture
    is_preview = models.BooleanField(default=False, help_text='Free preview for non-enrolled users')

    # Scheduling (optional)
    scheduled_start = models.DateTimeField(null=True, blank=True)
    scheduled_end   = models.DateTimeField(null=True, blank=True)
    duration_minutes = models.IntegerField(null=True, blank=True)

    # In-person
    location = models.CharField(max_length=500, blank=True, null=True)

    # Live
    meeting_url = models.URLField(blank=True, null=True)

    # Recorded — internal video (preferred, more secure)
    # recording_link is external fallback only
    recording_link = models.URLField(blank=True, null=True)

    # Enrollment
    max_students     = models.IntegerField(null=True, blank=True)
    enrolled_students = models.ManyToManyField(CustomUser, related_name='enrolled_classes', blank=True)
    enrolled_count   = models.IntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order', 'scheduled_start', 'id']

    def __str__(self):
        return f'{self.course.title} — {self.title}'

    def is_live_now(self):
        if not self.scheduled_start or not self.scheduled_end:
            return False
        now = timezone.now()
        return self.scheduled_start <= now <= self.scheduled_end

    def is_accessible_to(self, user):
        """Returns True if user can watch this lecture."""
        if self.is_preview:
            return True
        if not user or not user.is_authenticated:
            return False
        if self.course.tutor == user or user.role == 'admin':
            return True
        from apps.ratings.models import Progress
        return Progress.objects.filter(student=user, course=self.course).exists()
