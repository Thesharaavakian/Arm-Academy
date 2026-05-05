from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import GroupViewSet, GroupMembershipViewSet

router = DefaultRouter()
router.register(r'groups', GroupViewSet, basename='group')
router.register(r'memberships', GroupMembershipViewSet, basename='group-membership')

urlpatterns = router.urls
