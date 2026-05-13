from django.db import models
from django.utils import timezone
from apps.users.models import CustomUser


class ContentReport(models.Model):
    REASON_CHOICES = [
        ('inappropriate',  'Inappropriate Content'),
        ('copyright',      'Copyright Infringement / DMCA'),
        ('spam',           'Spam or Misleading'),
        ('hate_speech',    'Hate Speech or Discrimination'),
        ('illegal',        'Illegal Content'),
        ('underage',       'Child Safety Concern'),
        ('violence',       'Violence or Graphic Content'),
        ('adult_ungated',  'Adult Content Without Age Gate'),
        ('impersonation',  'Impersonation or Fake Profile'),
        ('other',          'Other'),
    ]

    STATUS_CHOICES = [
        ('pending',   'Pending Review'),
        ('reviewed',  'Reviewed — No Action'),
        ('actioned',  'Action Taken'),
        ('dismissed', 'Dismissed'),
    ]

    reporter = models.ForeignKey(
        CustomUser, on_delete=models.SET_NULL, null=True, related_name='reports_submitted',
    )

    # ── Target (at least one must be set) ──────────────────────────────────
    course        = models.ForeignKey('courses.Course',  on_delete=models.CASCADE, null=True, blank=True, related_name='reports')
    review        = models.ForeignKey('ratings.Review',  on_delete=models.CASCADE, null=True, blank=True, related_name='reports')
    reported_user = models.ForeignKey(CustomUser,        on_delete=models.CASCADE, null=True, blank=True, related_name='reports_against')
    class_session = models.ForeignKey('courses.Class',   on_delete=models.CASCADE, null=True, blank=True, related_name='reports')

    reason      = models.CharField(max_length=30, choices=REASON_CHOICES)
    description = models.TextField(blank=True)

    status      = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    admin_notes = models.TextField(blank=True)
    resolved_by = models.ForeignKey(
        CustomUser, on_delete=models.SET_NULL, null=True, blank=True, related_name='reports_resolved',
    )
    resolved_at = models.DateTimeField(null=True, blank=True)

    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        target = self.course or self.review or self.reported_user or self.class_session
        return f'Report [{self.reason}] on {target} by {self.reporter}'

    def resolve(self, admin_user, status, notes=''):
        self.status      = status
        self.admin_notes = notes
        self.resolved_by = admin_user
        self.resolved_at = timezone.now()
        self.save(update_fields=['status', 'admin_notes', 'resolved_by', 'resolved_at'])


class ModerationLog(models.Model):
    """Audit trail for all moderation actions."""
    ACTION_CHOICES = [
        ('approve',  'Course Approved'),
        ('reject',   'Course Rejected'),
        ('suspend',  'Content Suspended'),
        ('restore',  'Content Restored'),
        ('ban_user', 'User Banned'),
        ('warn_user','User Warned'),
        ('report_resolved', 'Report Resolved'),
    ]

    admin    = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, related_name='moderation_actions')
    action   = models.CharField(max_length=30, choices=ACTION_CHOICES)
    notes    = models.TextField(blank=True)

    # References to the moderated content
    course        = models.ForeignKey('courses.Course', on_delete=models.SET_NULL, null=True, blank=True)
    reported_user = models.ForeignKey(CustomUser,       on_delete=models.SET_NULL, null=True, blank=True, related_name='moderation_logs')
    report        = models.ForeignKey(ContentReport,    on_delete=models.SET_NULL, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.admin} → {self.action} at {self.created_at:%Y-%m-%d %H:%M}'
