from rest_framework import serializers
from .models import Message, GroupMessage, ClassChat


class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender.get_full_name', read_only=True)
    recipient_name = serializers.CharField(source='recipient.get_full_name', read_only=True)

    class Meta:
        model = Message
        fields = [
            'id', 'sender', 'sender_name', 'recipient', 'recipient_name',
            'content', 'is_read', 'read_at', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'sender', 'created_at', 'updated_at']


class GroupMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender.get_full_name', read_only=True)
    group_name = serializers.CharField(source='group.name', read_only=True)

    class Meta:
        model = GroupMessage
        fields = [
            'id', 'group', 'group_name', 'sender', 'sender_name',
            'content', 'reaction_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'sender', 'created_at', 'updated_at', 'reaction_count']


class ClassChatSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender.get_full_name', read_only=True)
    class_title = serializers.CharField(source='class_session.title', read_only=True)

    class Meta:
        model = ClassChat
        fields = [
            'id', 'class_session', 'class_title', 'sender', 'sender_name',
            'content', 'created_at'
        ]
        read_only_fields = ['id', 'sender', 'created_at']
