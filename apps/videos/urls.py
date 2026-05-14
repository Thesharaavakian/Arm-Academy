from rest_framework.routers import DefaultRouter
from .views import VideoViewSet, RecordingViewSet

router = DefaultRouter()
router.register(r'videos', VideoViewSet, basename='video')
router.register(r'recordings', RecordingViewSet, basename='recording')

urlpatterns = router.urls
