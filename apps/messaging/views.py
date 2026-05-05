from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from .models import Message, GroupMessage, ClassChat
from .serializers import MessageSerializer, GroupMessageSerializer, ClassChatSerializer


class MessageViewSet(viewsets.ModelViewSet):
    serializer_class = MessageSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['sender', 'recipient', 'is_read']
    ordering_fields = ['created_at']
    ordering = ['-created_at']
    
    def get_queryset(self):
        return Message.objects.filter(sender=self.request.user) | Message.objects.filter(recipient=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(sender=self.request.user)
    
    @action(detail=False, methods=['get'])
    def conversations(self, request):
        """Get list of conversations"""
        from django.db.models import Q
        user = request.user
        # Get unique conversations
        conversations = Message.objects.filter(Q(sender=user) | Q(recipient=user)).values_list('sender', 'recipient').distinct()
        return Response(conversations)


class GroupMessageViewSet(viewsets.ModelViewSet):
    queryset = GroupMessage.objects.all()
    serializer_class = GroupMessageSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['group', 'sender']
    search_fields = ['content']
    ordering_fields = ['created_at']
    ordering = ['-created_at']
    
    def perform_create(self, serializer):
        serializer.save(sender=self.request.user)


class ClassChatViewSet(viewsets.ModelViewSet):
    queryset = ClassChat.objects.all()
    serializer_class = ClassChatSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['class_session', 'sender']
    search_fields = ['content']
    ordering_fields = ['created_at']
    ordering = ['created_at']
    
    def perform_create(self, serializer):
        serializer.save(sender=self.request.user)
