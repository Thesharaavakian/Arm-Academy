from rest_framework import serializers
from .models import Group, GroupMembership


class GroupSerializer(serializers.ModelSerializer):
    creator_name = serializers.CharField(source='creator.get_full_name', read_only=True)
    member_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Group
        fields = [
            'id', 'name', 'description', 'group_type', 'creator', 'creator_name',
            'member_count', 'cover_image', 'is_private', 'require_approval',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'creator', 'created_at', 'updated_at']
    
    def get_member_count(self, obj):
        return obj.members.count()


class GroupDetailSerializer(GroupSerializer):
    members = serializers.PrimaryKeyRelatedField(many=True, read_only=True)
    
    class Meta(GroupSerializer.Meta):
        fields = GroupSerializer.Meta.fields + ['members']


class GroupMembershipSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    group_name = serializers.CharField(source='group.name', read_only=True)
    
    class Meta:
        model = GroupMembership
        fields = ['id', 'group', 'group_name', 'user', 'user_name', 'role', 'is_active', 'joined_at']
        read_only_fields = ['id', 'joined_at']
