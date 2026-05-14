from rest_framework.routers import DefaultRouter
from .views import MessageViewSet, GroupMessageViewSet, ClassChatViewSet

router = DefaultRouter()
router.register(r'messages', MessageViewSet, basename='message')
router.register(r'group-messages', GroupMessageViewSet, basename='group-message')
router.register(r'class-chat', ClassChatViewSet, basename='class-chat')

urlpatterns = router.urls
