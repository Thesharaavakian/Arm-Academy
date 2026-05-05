from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenRefreshView, TokenVerifyView
from .views import HealthCheckView, api_root
from apps.users.views import CustomTokenObtainPairView, RegisterView, LogoutView

urlpatterns = [
    path('', api_root, name='api-root'),
    path('health/', HealthCheckView.as_view(), name='health-check'),
    path('admin/', admin.site.urls),

    # JWT auth endpoints
    path('api/auth/login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/verify/', TokenVerifyView.as_view(), name='token_verify'),
    path('api/auth/register/', RegisterView.as_view(), name='register'),
    path('api/auth/logout/', LogoutView.as_view(), name='logout'),

    # Resource routes
    path('api/', include([
        path('users/', include('apps.users.urls')),
        path('', include('apps.courses.urls')),
        path('', include('apps.groups.urls')),
        path('', include('apps.messaging.urls')),
        path('', include('apps.videos.urls')),
        path('', include('apps.ratings.urls')),
    ])),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += [path('api-auth/', include('rest_framework.urls'))]
