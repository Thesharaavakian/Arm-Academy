from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from .models import Group, GroupMembership
from .serializers import GroupSerializer, GroupDetailSerializer, GroupMembershipSerializer


class GroupViewSet(viewsets.ModelViewSet):
    queryset = Group.objects.all()
    serializer_class = GroupSerializer
    permission_classes = [AllowAny]
    filterset_fields = ['group_type', 'is_private', 'creator']
    search_fields = ['name', 'description']
    ordering_fields = ['created_at', 'member_count']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return GroupDetailSerializer
        return GroupSerializer
    
    def perform_create(self, serializer):
        serializer.save(creator=self.request.user)
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def join(self, request, pk=None):
        """Join a group"""
        group = self.get_object()
        if request.user in group.members.all():
            return Response({'detail': 'Already a member'}, status=status.HTTP_400_BAD_REQUEST)
        group.members.add(request.user)
        group.member_count = group.members.count()
        group.save()
        return Response({'detail': 'Successfully joined'}, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def leave(self, request, pk=None):
        """Leave a group"""
        group = self.get_object()
        if request.user not in group.members.all():
            return Response({'detail': 'Not a member'}, status=status.HTTP_400_BAD_REQUEST)
        group.members.remove(request.user)
        group.member_count = group.members.count()
        group.save()
        return Response({'detail': 'Successfully left'}, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['get', 'post'])
    def messages(self, request, pk=None):
        """Get or post group messages"""
        group = self.get_object()
        if request.method == 'GET':
            messages = group.messages.all()
            from apps.messaging.serializers import GroupMessageSerializer
            serializer = GroupMessageSerializer(messages, many=True)
            return Response(serializer.data)
        else:  # POST
            from apps.messaging.models import GroupMessage
            message = GroupMessage.objects.create(
                group=group,
                sender=request.user,
                content=request.data.get('content', '')
            )
            from apps.messaging.serializers import GroupMessageSerializer
            serializer = GroupMessageSerializer(message)
            return Response(serializer.data, status=status.HTTP_201_CREATED)


class GroupMembershipViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = GroupMembership.objects.all()
    serializer_class = GroupMembershipSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['group', 'role', 'is_active']
    ordering_fields = ['joined_at']
    ordering = ['-joined_at']
