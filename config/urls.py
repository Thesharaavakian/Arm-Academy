from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenRefreshView, TokenVerifyView
from .views import HealthCheckView, api_root
from apps.users.views import (
    CustomLoginView, RegisterView, VerifyEmailView, ResendEmailOTPView,
    Verify2FAView, Setup2FAView, SendPhoneOTPView, VerifyPhoneView, LogoutView,
    ForgotPasswordView, ResetPasswordView,
)
from apps.payments.views import StripeWebhookView

urlpatterns = [
    path('', api_root, name='api-root'),
    path('health/', HealthCheckView.as_view(), name='health-check'),
    path('admin/', admin.site.urls),

    # ── Authentication ──────────────────────────────────────────────────────
    path('api/auth/register/',           RegisterView.as_view(),          name='register'),
    path('api/auth/login/',              CustomLoginView.as_view(),        name='login'),
    path('api/auth/logout/',             LogoutView.as_view(),             name='logout'),
    path('api/auth/refresh/',            TokenRefreshView.as_view(),       name='token_refresh'),
    path('api/auth/verify-token/',       TokenVerifyView.as_view(),        name='token_verify'),

    # ── Email verification ──────────────────────────────────────────────────
    path('api/auth/verify-email/',       VerifyEmailView.as_view(),        name='verify_email'),
    path('api/auth/resend-email-otp/',   ResendEmailOTPView.as_view(),     name='resend_email_otp'),

    # ── Password reset ───────────────────────────────────────────────────────
    path('api/auth/forgot-password/',    ForgotPasswordView.as_view(),     name='forgot_password'),
    path('api/auth/reset-password/',     ResetPasswordView.as_view(),      name='reset_password'),

    # ── 2FA ─────────────────────────────────────────────────────────────────
    path('api/auth/verify-2fa/',         Verify2FAView.as_view(),          name='verify_2fa'),
    path('api/auth/setup-2fa/',          Setup2FAView.as_view(),           name='setup_2fa'),

    # ── Phone verification ───────────────────────────────────────────────────
    path('api/auth/send-phone-otp/',     SendPhoneOTPView.as_view(),       name='send_phone_otp'),
    path('api/auth/verify-phone/',       VerifyPhoneView.as_view(),        name='verify_phone'),

    # ── Stripe webhook (no auth — Stripe signs the payload) ─────────────────
    path('api/payments/webhook/',        StripeWebhookView.as_view(),      name='stripe_webhook'),

    # ── Resource APIs ────────────────────────────────────────────────────────
    path('api/', include([
        path('', include('apps.users.urls')),
        path('', include('apps.courses.urls')),
        path('', include('apps.groups.urls')),
        path('', include('apps.messaging.urls')),
        path('', include('apps.videos.urls')),
        path('', include('apps.ratings.urls')),
        path('', include('apps.payments.urls')),
    ])),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += [path('api-auth/', include('rest_framework.urls'))]
