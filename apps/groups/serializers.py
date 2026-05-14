from rest_framework import serializers
from .models import Group, GroupMembership


class GroupSerializer(serializers.ModelSerializer):
    creator_name = serializers.SerializerMethodField()
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

    def get_creator_name(self, obj):
        return obj.creator.get_full_name() or obj.creator.username

    def get_member_count(self, obj):
        return obj.members.count()

    def get_is_member(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return obj.members.filter(pk=request.user.pk).exists()


class GroupDetailSerializer(GroupSerializer):
    members = serializers.PrimaryKeyRelatedField(many=True, read_only=True)

    class Meta(GroupSerializer.Meta):
        fields = GroupSerializer.Meta.fields + ['members']


class GroupMembershipSerializer(serializers.ModelSerializer):
    user_name  = serializers.SerializerMethodField()
    group_name = serializers.CharField(source='group.name', read_only=True)

    class Meta:
        model  = GroupMembership
        fields = ['id', 'group', 'group_name', 'user', 'user_name', 'role', 'is_active', 'joined_at']
        read_only_fields = ['id', 'joined_at']

    def get_user_name(self, obj):
        return obj.user.get_full_name() or obj.user.username
