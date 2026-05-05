from django.contrib import admin
from .models import Course, Class

@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ['title', 'tutor', 'is_published', 'level', 'total_students', 'average_rating']
    list_filter = ['level', 'is_published', 'is_free', 'created_at']
    search_fields = ['title', 'description', 'tutor__username']
    fieldsets = (
        ('Basic Info', {'fields': ('title', 'description', 'tutor')}),
        ('Content', {'fields': ('cover_image', 'category', 'level')}),
        ('Pricing', {'fields': ('is_free', 'subscription_required')}),
        ('Stats', {'fields': ('total_students', 'average_rating', 'total_reviews')}),
        ('Status', {'fields': ('is_published', 'created_at', 'updated_at')}),
    )
    readonly_fields = ['created_at', 'updated_at']


@admin.register(Class)
class ClassAdmin(admin.ModelAdmin):
    list_display = ['title', 'course', 'class_type', 'status', 'scheduled_start', 'enrolled_count']
    list_filter = ['class_type', 'status', 'scheduled_start']
    search_fields = ['title', 'course__title']
    fieldsets = (
        ('Basic Info', {'fields': ('course', 'title', 'description')}),
        ('Type & Status', {'fields': ('class_type', 'status')}),
        ('Schedule', {'fields': ('scheduled_start', 'scheduled_end', 'duration_minutes')}),
        ('Location', {'fields': ('location', 'meeting_url', 'recording_link')}),
        ('Enrollment', {'fields': ('max_students', 'enrolled_count', 'enrolled_students')}),
        ('Timestamps', {'fields': ('created_at', 'updated_at')}),
    )
    readonly_fields = ['created_at', 'updated_at']
