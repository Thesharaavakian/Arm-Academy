from django.contrib import admin
from .models import Group, GroupMembership


@admin.register(Group)
class GroupAdmin(admin.ModelAdmin):
    list_display = ['name', 'group_type', 'creator', 'member_count', 'is_private']
    list_filter = ['group_type', 'is_private', 'created_at']
    search_fields = ['name', 'creator__username']
    fieldsets = (
        ('Basic Info', {'fields': ('name', 'description', 'creator')}),
        ('Type', {'fields': ('group_type',)}),
        ('Members', {'fields': ('members', 'member_count')}),
        ('Image', {'fields': ('cover_image',)}),
        ('Settings', {'fields': ('is_private', 'require_approval')}),
        ('Timestamps', {'fields': ('created_at', 'updated_at')}),
    )
    readonly_fields = ['created_at', 'updated_at']


@admin.register(GroupMembership)
class GroupMembershipAdmin(admin.ModelAdmin):
    list_display = ['user', 'group', 'role', 'is_active', 'joined_at']
    list_filter = ['role', 'is_active', 'joined_at']
    search_fields = ['user__username', 'group__name']
