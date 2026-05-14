from rest_framework import serializers
from .models import Group, GroupMembership


class GroupSerializer(serializers.ModelSerializer):
    # Use display_name property (get_full_name() or username) already on CustomUser
    creator_name = serializers.CharField(source='creator.display_name', read_only=True)
    member_count = serializers.SerializerMethodField()
    is_member    = serializers.SerializerMethodField()

    class Meta:
        model  = Group
        fields = [
            'id', 'name', 'description', 'group_type', 'creator', 'creator_name',
            'member_count', 'is_member', 'cover_image', 'is_private', 'require_approval',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'creator', 'created_at', 'updated_at']

    def get_member_count(self, obj):
        # Use pre-annotated value when available (avoids per-row COUNT query in list)
        return getattr(obj, 'member_count_ann', obj.members.count())

    def get_is_member(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        # Use pre-annotated value when available (avoids per-row EXISTS query in list)
        ann = getattr(obj, 'is_member_ann', None)
        if ann is not None:
            return bool(ann)
        return obj.members.filter(pk=request.user.pk).exists()


class GroupDetailSerializer(GroupSerializer):
    members = serializers.PrimaryKeyRelatedField(many=True, read_only=True)

    class Meta(GroupSerializer.Meta):
        fields = GroupSerializer.Meta.fields + ['members']


class GroupMembershipSerializer(serializers.ModelSerializer):
    user_name  = serializers.CharField(source='user.display_name', read_only=True)
    group_name = serializers.CharField(source='group.name', read_only=True)

    class Meta:
        model  = GroupMembership
        fields = ['id', 'group', 'group_name', 'user', 'user_name', 'role', 'is_active', 'joined_at']
        read_only_fields = ['id', 'joined_at']
