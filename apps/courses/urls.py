from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CourseViewSet, ClassViewSet, SectionViewSet

router = DefaultRouter()
router.register(r'courses',  CourseViewSet,  basename='course')
router.register(r'classes',  ClassViewSet,   basename='class')
router.register(r'sections', SectionViewSet, basename='section')

urlpatterns = [path('', include(router.urls))]
