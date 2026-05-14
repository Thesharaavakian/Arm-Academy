from django.db.models import Count, Exists, OuterRef
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from .models import Group, GroupMembership
from .serializers import GroupSerializer, GroupDetailSerializer, GroupMembershipSerializer


class GroupViewSet(viewsets.ModelViewSet):
    serializer_class = GroupSerializer
    filterset_fields = ['group_type', 'is_private', 'creator']
    search_fields    = ['name', 'description']
    ordering         = ['-created_at']

    def get_queryset(self):
        user = self.request.user
        qs   = Group.objects.annotate(member_count_ann=Count('members', distinct=True))
        if user.is_authenticated:
            qs = qs.annotate(
                is_member_ann=Exists(
                    Group.members.through.objects.filter(
                        group_id=OuterRef('pk'),
                        customuser_id=user.pk,
                    )
                )
            )
        return qs

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
        group.members.add(self.request.user)

    def perform_update(self, serializer):
        group = self.get_object()
        if group.creator != self.request.user and self.request.user.role != 'admin':
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Only the group creator can edit this group.')
        serializer.save()

    def perform_destroy(self, instance):
        if instance.creator != self.request.user and self.request.user.role != 'admin':
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Only the group creator can delete this group.')
        instance.delete()

    @action(detail=True, methods=['post'])
    def join(self, request, pk=None):
        group = self.get_object()
        if group.members.filter(pk=request.user.pk).exists():
            return Response({'detail': 'Already a member.'}, status=400)
        if group.is_private:
            return Response({'detail': 'This is a private group. Request membership from the creator.'}, status=403)
        group.members.add(request.user)
        return Response({'detail': 'Joined group.'})

    @action(detail=True, methods=['post'])
    def leave(self, request, pk=None):
        group = self.get_object()
        if not group.members.filter(pk=request.user.pk).exists():
            return Response({'detail': 'Not a member.'}, status=400)
        if group.creator == request.user:
            return Response({'detail': 'Group creator cannot leave. Transfer ownership first.'}, status=400)
        group.members.remove(request.user)
        return Response({'detail': 'Left group.'})

    @action(detail=True, methods=['get', 'post'])
    def messages(self, request, pk=None):
        group = self.get_object()
        if request.method == 'GET':
            from apps.messaging.serializers import GroupMessageSerializer
            return Response(GroupMessageSerializer(group.messages.all(), many=True).data)
        from apps.messaging.models import GroupMessage
        from apps.messaging.serializers import GroupMessageSerializer
        msg = GroupMessage.objects.create(group=group, sender=request.user,
                                          content=request.data.get('content', ''))
        return Response(GroupMessageSerializer(msg).data, status=201)


class GroupMembershipViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = GroupMembership.objects.all()
    serializer_class = GroupMembershipSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['group', 'role', 'is_active']
    ordering = ['-joined_at']
