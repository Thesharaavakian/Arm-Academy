from django.contrib import admin
from .models import Message, GroupMessage, ClassChat


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ['sender', 'recipient', 'is_read', 'created_at']
    list_filter = ['is_read', 'created_at']
    search_fields = ['sender__username', 'recipient__username']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(GroupMessage)
class GroupMessageAdmin(admin.ModelAdmin):
    list_display = ['sender', 'group', 'created_at']
    list_filter = ['group', 'created_at']
    search_fields = ['sender__username', 'group__name']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(ClassChat)
class ClassChatAdmin(admin.ModelAdmin):
    list_display = ['sender', 'class_session', 'created_at']
    list_filter = ['created_at']
    search_fields = ['sender__username', 'class_session__title']
    readonly_fields = ['created_at']
