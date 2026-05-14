from rest_framework.routers import DefaultRouter
from .views import ReviewViewSet, ProgressViewSet, AttendanceViewSet, CertificateViewSet

router = DefaultRouter()
router.register(r'reviews', ReviewViewSet, basename='review')
router.register(r'progress', ProgressViewSet, basename='progress')
router.register(r'attendance', AttendanceViewSet, basename='attendance')
router.register(r'certificates', CertificateViewSet, basename='certificate')

urlpatterns = router.urls
