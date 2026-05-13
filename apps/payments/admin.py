from django.contrib import admin
from .models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display  = ['student', 'course', 'amount_amd_display', 'status', 'created_at']
    list_filter   = ['status', 'created_at']
    search_fields = ['student__email', 'student__username', 'course__title']
    readonly_fields = ['created_at', 'updated_at', 'stripe_checkout_session_id', 'stripe_payment_intent_id']
    ordering = ['-created_at']
    actions = ['confirm_payments']

    @admin.display(description='Amount (AMD)')
    def amount_amd_display(self, obj):
        return f'{obj.amount_amd:,.0f} ֏'

    @admin.action(description='✅ Confirm selected pending payments + enroll students')
    def confirm_payments(self, request, qs):
        from apps.payments.views import _auto_enroll
        confirmed = 0
        for payment in qs.filter(status='pending'):
            payment.status = 'completed'
            payment.save()
            _auto_enroll(payment.student, payment.course)
            confirmed += 1
        self.message_user(request, f'{confirmed} payment(s) confirmed and students enrolled.')
