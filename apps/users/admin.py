from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser, OTPVerification


@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    list_display = [
        'username', 'email', 'full_name', 'role', 'email_verified',
        'is_verified', 'two_fa_enabled', 'date_joined',
    ]
    list_filter  = ['role', 'email_verified', 'phone_verified', 'is_verified', 'two_fa_enabled', 'is_active']
    search_fields = ['username', 'email', 'first_name', 'last_name', 'phone_number']
    ordering = ['-date_joined']
    readonly_fields = [
        'date_joined', 'last_login', 'created_at', 'updated_at',
        'average_rating', 'total_reviews', 'total_students',
        'email_verified', 'phone_verified',
    ]

    fieldsets = (
        ('Account', {'fields': ('username', 'password')}),
        ('Personal Info', {'fields': ('first_name', 'last_name', 'email', 'phone_number', 'bio', 'profile_picture')}),
        ('Role & Status', {'fields': ('role', 'is_verified', 'is_active', 'is_staff', 'is_superuser')}),
        ('Verification', {'fields': ('email_verified', 'phone_verified', 'two_fa_enabled')}),
        ('Tutor Stats', {'fields': ('expertise_areas', 'hourly_rate', 'average_rating', 'total_reviews', 'total_students')}),
        ('Timestamps', {'fields': ('date_joined', 'last_login', 'created_at', 'updated_at')}),
    )

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'email', 'first_name', 'last_name', 'role', 'password1', 'password2'),
        }),
    )

    actions = ['verify_users', 'unverify_users', 'mark_email_verified']

    @admin.display(description='Full Name')
    def full_name(self, obj):
        return obj.get_full_name() or '—'

    @admin.action(description='✅ Mark selected users as verified tutors')
    def verify_users(self, request, qs):
        qs.update(is_verified=True)

    @admin.action(description='❌ Remove tutor verification')
    def unverify_users(self, request, qs):
        qs.update(is_verified=False)

    @admin.action(description='📧 Mark email as verified')
    def mark_email_verified(self, request, qs):
        qs.update(email_verified=True)


@admin.register(OTPVerification)
class OTPVerificationAdmin(admin.ModelAdmin):
    list_display  = ['user', 'otp_type', 'code', 'is_used', 'expires_at', 'created_at']
    list_filter   = ['otp_type', 'is_used']
    search_fields = ['user__email', 'user__username']
    readonly_fields = ['created_at']
    ordering = ['-created_at']
