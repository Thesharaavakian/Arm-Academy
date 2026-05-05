from django.contrib import admin
from .models import Review, Progress, Attendance, Certificate

@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ['reviewer', 'rating', 'tutor', 'course', 'is_verified', 'created_at']
    list_filter = ['rating', 'is_verified', 'created_at']
    search_fields = ['reviewer__username', 'tutor__username', 'course__title']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(Progress)
class ProgressAdmin(admin.ModelAdmin):
    list_display = ['student', 'course', 'completion_percentage', 'is_completed']
    list_filter = ['is_completed', 'completed_at']
    search_fields = ['student__username', 'course__title']
    readonly_fields = ['started_at']


@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display = ['student', 'class_session', 'status', 'recorded_at']
    list_filter = ['status', 'recorded_at']
    search_fields = ['student__username', 'class_session__title']
    readonly_fields = ['recorded_at']


@admin.register(Certificate)
class CertificateAdmin(admin.ModelAdmin):
    list_display = ['student', 'course', 'certificate_number', 'is_valid']
    list_filter = ['is_valid', 'issue_date']
    search_fields = ['student__username', 'course__title', 'certificate_number']
