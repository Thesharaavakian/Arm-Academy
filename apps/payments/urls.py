from django.urls import path
from .views import InitiatePaymentView, StripeWebhookView, ConfirmManualPaymentView, MyPaymentsView

urlpatterns = [
    path('payments/initiate/<int:course_id>/', InitiatePaymentView.as_view(),   name='payment_initiate'),
    path('payments/webhook/',                  StripeWebhookView.as_view(),      name='stripe_webhook'),
    path('payments/confirm/<int:payment_id>/', ConfirmManualPaymentView.as_view(), name='payment_confirm'),
    path('payments/mine/',                     MyPaymentsView.as_view(),         name='my_payments'),
]
