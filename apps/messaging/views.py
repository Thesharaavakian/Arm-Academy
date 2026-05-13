from django.db.models import Q
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Message, GroupMessage, ClassChat
from .serializers import MessageSerializer, GroupMessageSerializer, ClassChatSerializer


class MessageViewSet(viewsets.ModelViewSet):
    serializer_class = MessageSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['sender', 'recipient', 'is_read']
    ordering_fields = ['created_at']
    ordering = ['-created_at']

    def get_queryset(self):
        user = self.request.user
        return Message.objects.filter(
            Q(sender=user) | Q(recipient=user)
        ).select_related('sender', 'recipient')

    def perform_create(self, serializer):
        serializer.save(sender=self.request.user)

    @action(detail=False, methods=['get'])
    def conversations(self, request):
        """Return unique conversations with last message preview + unread count."""
        from apps.users.models import CustomUser
        from apps.users.serializers import UserSerializer
        user = request.user

        sent_ids     = set(Message.objects.filter(sender=user).values_list('recipient_id', flat=True))
        received_ids = set(Message.objects.filter(recipient=user).values_list('sender_id', flat=True))
        contact_ids  = sent_ids | received_ids

        results = []
        for cid in contact_ids:
            try:
                contact = CustomUser.objects.get(pk=cid)
            except CustomUser.DoesNotExist:
                continue

            last = Message.objects.filter(
                Q(sender=user, recipient=contact) | Q(sender=contact, recipient=user)
            ).order_by('-created_at').first()

            unread = Message.objects.filter(
                sender=contact, recipient=user, is_read=False
            ).count()

            results.append({
                'user': UserSerializer(contact).data,
                'last_message': last.content[:80] if last else '',
                'last_message_time': last.created_at if last else None,
                'unread_count': unread,
                'i_sent_last': last.sender_id == user.pk if last else False,
            })

        results.sort(
            key=lambda x: x['last_message_time'] or timezone.datetime.min.replace(tzinfo=timezone.utc),
            reverse=True,
        )
        return Response(results)

    @action(detail=False, methods=['get'])
    def thread(self, request):
        """Fetch and mark-read the thread between current user and ?with=<user_id>."""
        other_id = request.query_params.get('with')
        if not other_id:
            return Response({'detail': '"with" query param required.'}, status=400)

        msgs = Message.objects.filter(
            Q(sender=request.user, recipient_id=other_id) |
            Q(sender_id=other_id, recipient=request.user)
        ).order_by('created_at').select_related('sender', 'recipient')

        Message.objects.filter(
            sender_id=other_id, recipient=request.user, is_read=False
        ).update(is_read=True, read_at=timezone.now())

        return Response(MessageSerializer(msgs, many=True).data)

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        msg = self.get_object()
        if msg.recipient == request.user and not msg.is_read:
            msg.is_read = True
            msg.read_at = timezone.now()
            msg.save(update_fields=['is_read', 'read_at'])
        return Response(MessageSerializer(msg).data)


class GroupMessageViewSet(viewsets.ModelViewSet):
    serializer_class = GroupMessageSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['group', 'sender']
    search_fields = ['content']
    ordering = ['-created_at']

    def get_queryset(self):
        return GroupMessage.objects.filter(
            group__members=self.request.user
        ).select_related('sender', 'group')

    def perform_create(self, serializer):
        serializer.save(sender=self.request.user)


class ClassChatViewSet(viewsets.ModelViewSet):
    serializer_class = ClassChatSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['class_session', 'sender']
    ordering = ['created_at']

    def get_queryset(self):
        user = self.request.user
        return ClassChat.objects.filter(
            Q(class_session__course__tutor=user) |
            Q(class_session__enrolled_students=user)
        ).distinct().select_related('sender', 'class_session')

    def perform_create(self, serializer):
        serializer.save(sender=self.request.user)
