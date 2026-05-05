from django.contrib import admin
from .models import Video, Recording

@admin.register(Video)
class VideoAdmin(admin.ModelAdmin):
    list_display = ['title', 'uploaded_by', 'status', 'view_count', 'created_at']
    list_filter = ['status', 'is_public', 'created_at']
    search_fields = ['title', 'uploaded_by__username']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(Recording)
class RecordingAdmin(admin.ModelAdmin):
    list_display = ['class_session', 'is_ready', 'created_at']
    list_filter = ['is_ready', 'created_at']
    search_fields = ['class_session__title']
    readonly_fields = ['created_at']
