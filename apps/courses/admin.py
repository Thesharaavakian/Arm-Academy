from django.contrib import admin
from .models import Course, Class, Section


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = [
        'title', 'tutor', 'content_rating', 'moderation_status',
        'is_published', 'total_students', 'average_rating', 'created_at',
    ]
    list_filter  = ['moderation_status', 'content_rating', 'level', 'is_published', 'is_free']
    search_fields = ['title', 'description', 'tutor__username', 'tutor__email']
    readonly_fields = [
        'created_at', 'updated_at', 'moderated_by', 'moderated_at',
        'total_students', 'average_rating', 'total_reviews',
    ]
    actions = ['approve_courses', 'reject_courses', 'suspend_courses']
    ordering = ['-created_at']

    fieldsets = (
        ('Basic Info',   {'fields': ('title', 'description', 'tutor', 'cover_image', 'trailer_url')}),
        ('Curriculum',   {'fields': ('category', 'level', 'language', 'tags', 'requirements', 'what_you_learn')}),
        ('Pricing',      {'fields': ('is_free', 'price_amd', 'subscription_required')}),
        ('Stats',        {'fields': ('total_students', 'average_rating', 'total_reviews', 'total_lectures')}),
        ('🔞 Content',   {'fields': ('content_rating',)}),
        ('🛡 Moderation', {'fields': ('moderation_status', 'rejection_reason', 'moderated_by', 'moderated_at')}),
        ('Visibility',   {'fields': ('is_published', 'created_at', 'updated_at')}),
    )

    @admin.action(description='✅ Approve selected courses')
    def approve_courses(self, request, qs):
        count = 0
        for course in qs:
            course.approve(request.user)
            count += 1
        self.message_user(request, f'{count} course(s) approved and published.')

    @admin.action(description='❌ Reject selected courses')
    def reject_courses(self, request, qs):
        for course in qs:
            course.reject(request.user, reason='Rejected via bulk action. See admin for details.')
        self.message_user(request, f'{qs.count()} course(s) rejected.')

    @admin.action(description='🚫 Suspend selected courses')
    def suspend_courses(self, request, qs):
        for course in qs:
            course.suspend(request.user, reason='Suspended via admin.')
        self.message_user(request, f'{qs.count()} course(s) suspended.')


@admin.register(Section)
class SectionAdmin(admin.ModelAdmin):
    list_display  = ['title', 'course', 'order']
    list_filter   = ['course']
    search_fields = ['title', 'course__title']
    ordering      = ['course', 'order']


@admin.register(Class)
class ClassAdmin(admin.ModelAdmin):
    list_display  = ['title', 'course', 'section', 'class_type', 'is_preview', 'status', 'order']
    list_filter   = ['class_type', 'status', 'is_preview']
    search_fields = ['title', 'course__title']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['course', 'order']
