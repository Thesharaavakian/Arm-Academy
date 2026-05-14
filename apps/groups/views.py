from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from .models import Group, GroupMembership
from .serializers import GroupSerializer, GroupDetailSerializer, GroupMembershipSerializer


class GroupViewSet(viewsets.ModelViewSet):
    queryset = Group.objects.all()
    serializer_class = GroupSerializer
    filterset_fields = ['group_type', 'is_private', 'creator']
    search_fields = ['name', 'description']
    ordering = ['-created_at']

    def get_serializer_class(self):
        return GroupDetailSerializer if self.action == 'retrieve' else GroupSerializer

    def get_permissions(self):
        if self.action in ('create', 'join', 'leave', 'messages'):
            return [IsAuthenticated()]
        if self.action in ('update', 'partial_update', 'destroy'):
            return [IsAuthenticated()]
        return [AllowAny()]

    def perform_create(self, serializer):
        group = serializer.save(creator=self.request.user)
        # Creator is automatically a member
        group.members.add(self.request.user)

    @action(detail=True, methods=['post'])
    def join(self, request, pk=None):
        group = self.get_object()
        if group.members.filter(pk=request.user.pk).exists():
            return Response({'detail': 'Already a member.'}, status=400)
        group.members.add(request.user)
        return Response({'detail': 'Joined group.', 'member_count': group.members.count()})

    @action(detail=True, methods=['post'])
    def leave(self, request, pk=None):
        group = self.get_object()
        if not group.members.filter(pk=request.user.pk).exists():
            return Response({'detail': 'Not a member.'}, status=400)
        if group.creator == request.user:
            return Response({'detail': 'Group creator cannot leave. Transfer ownership first.'}, status=400)
        group.members.remove(request.user)
        return Response({'detail': 'Left group.', 'member_count': group.members.count()})

    @action(detail=True, methods=['get', 'post'])
    def messages(self, request, pk=None):
        group = self.get_object()
        if request.method == 'GET':
            from apps.messaging.serializers import GroupMessageSerializer
            return Response(GroupMessageSerializer(group.messages.all(), many=True).data)
        from apps.messaging.models import GroupMessage
        from apps.messaging.serializers import GroupMessageSerializer
        msg = GroupMessage.objects.create(group=group, sender=request.user, content=request.data.get('content', ''))
        return Response(GroupMessageSerializer(msg).data, status=201)


class GroupMembershipViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = GroupMembership.objects.all()
    serializer_class = GroupMembershipSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['group', 'role', 'is_active']
    ordering = ['-joined_at']
