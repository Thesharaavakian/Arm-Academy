from rest_framework import serializers
from .models import Review, Progress, Attendance, Certificate


class ReviewSerializer(serializers.ModelSerializer):
    reviewer_name = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = [
            'id', 'tutor', 'course', 'reviewer', 'reviewer_name',
            'title', 'comment', 'rating', 'is_verified', 'helpful_count',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'reviewer', 'is_verified', 'helpful_count',
            'created_at', 'updated_at',
        ]

    def get_reviewer_name(self, obj):
        return obj.reviewer.get_full_name() or obj.reviewer.username


class ProgressSerializer(serializers.ModelSerializer):
    course_title = serializers.CharField(source='course.title', read_only=True)

    class Meta:
        model = Progress
        fields = [
            'id', 'student', 'course', 'course_title', 'total_classes',
            'attended_classes', 'completion_percentage', 'is_completed',
            'started_at', 'last_accessed', 'completed_at'
        ]
        read_only_fields = [
            'id', 'student', 'started_at', 'last_accessed',
            'completion_percentage', 'attended_classes',
        ]


class AttendanceSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.get_full_name', read_only=True)
    class_title = serializers.CharField(source='class_session.title', read_only=True)

    class Meta:
        model = Attendance
        fields = [
            'id', 'student', 'student_name', 'class_session', 'class_title',
            'status', 'notes', 'recorded_at'
        ]
        read_only_fields = ['id', 'recorded_at']


class CertificateSerializer(serializers.ModelSerializer):
    course_title = serializers.CharField(source='course.title', read_only=True)
    student_name = serializers.CharField(source='student.get_full_name', read_only=True)

    class Meta:
        model = Certificate
        fields = [
            'id', 'student', 'student_name', 'course', 'course_title',
            'certificate_number', 'issue_date', 'is_valid'
        ]
        read_only_fields = ['id', 'certificate_number', 'issue_date']
