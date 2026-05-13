from django.contrib import admin
from django.utils import timezone
from .models import ContentReport, ModerationLog


@admin.register(ContentReport)
class ContentReportAdmin(admin.ModelAdmin):
    list_display  = ['id', 'reason', 'reporter', 'target_summary', 'status', 'created_at']
    list_filter   = ['status', 'reason', 'created_at']
    search_fields = ['reporter__email', 'description']
    readonly_fields = ['reporter', 'created_at', 'resolved_at']
    ordering = ['-created_at']
    actions = ['mark_reviewed', 'mark_actioned', 'dismiss']

    @admin.display(description='Target')
    def target_summary(self, obj):
        if obj.course:        return f'Course: {obj.course.title[:40]}'
        if obj.reported_user: return f'User: {obj.reported_user.username}'
        if obj.review:        return f'Review #{obj.review.id}'
        return '—'

    @admin.action(description='Mark as Reviewed (No Action)')
    def mark_reviewed(self, request, qs):
        qs.update(status='reviewed', resolved_by=request.user, resolved_at=timezone.now())

    @admin.action(description='Mark as Action Taken')
    def mark_actioned(self, request, qs):
        qs.update(status='actioned', resolved_by=request.user, resolved_at=timezone.now())

    @admin.action(description='Dismiss Reports')
    def dismiss(self, request, qs):
        qs.update(status='dismissed', resolved_by=request.user, resolved_at=timezone.now())


@admin.register(ModerationLog)
class ModerationLogAdmin(admin.ModelAdmin):
    list_display = ['action', 'admin', 'course', 'reported_user', 'created_at']
    list_filter  = ['action', 'created_at']
    readonly_fields = ['created_at']
    ordering = ['-created_at']
