from rest_framework import serializers
from .models import ContentReport


class ContentReportSerializer(serializers.ModelSerializer):
    reporter_name = serializers.CharField(source='reporter.display_name', read_only=True)

    class Meta:
        model  = ContentReport
        fields = [
            'id', 'reporter', 'reporter_name',
            'course', 'review', 'reported_user', 'class_session',
            'reason', 'description', 'status', 'admin_notes',
            'created_at', 'resolved_at',
        ]
        read_only_fields = ['id', 'reporter', 'status', 'admin_notes', 'resolved_at', 'created_at']

    def validate(self, data):
        targets = [data.get('course'), data.get('review'), data.get('reported_user'), data.get('class_session')]
        if not any(targets):
            raise serializers.ValidationError('At least one of course, review, reported_user, or class_session is required.')
        return data
