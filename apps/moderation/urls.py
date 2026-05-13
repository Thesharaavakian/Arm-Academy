from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ContentReportViewSet, CourseModerateView, ModerationQueueView

router = DefaultRouter()
router.register(r'reports', ContentReportViewSet, basename='report')

urlpatterns = [
    path('', include(router.urls)),
    path('moderate/course/<int:course_id>/', CourseModerateView.as_view(), name='moderate_course'),
    path('queue/',                           ModerationQueueView.as_view(), name='mod_queue'),
]
