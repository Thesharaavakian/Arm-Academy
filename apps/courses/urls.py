from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import CourseViewSet, ClassViewSet

router = DefaultRouter()
router.register(r'courses', CourseViewSet, basename='course')
router.register(r'classes', ClassViewSet, basename='class')

urlpatterns = router.urls
