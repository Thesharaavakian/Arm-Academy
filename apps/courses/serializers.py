from rest_framework import serializers
from .models import Course, Class


class CourseSerializer(serializers.ModelSerializer):
    tutor_name = serializers.SerializerMethodField()
    is_enrolled = serializers.SerializerMethodField()
    is_owner = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = [
            'id', 'title', 'description', 'tutor', 'tutor_name',
            'cover_image', 'category', 'level', 'is_free',
            'subscription_required', 'total_students', 'average_rating',
            'total_reviews', 'is_published', 'is_enrolled', 'is_owner',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at',
            'total_students', 'average_rating', 'total_reviews',
        ]

    def get_tutor_name(self, obj):
        return obj.tutor.get_full_name() or obj.tutor.username

    def get_is_enrolled(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        from apps.ratings.models import Progress
        return Progress.objects.filter(student=request.user, course=obj).exists()

    def get_is_owner(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return obj.tutor_id == request.user.pk or request.user.role == 'admin'


class ClassSerializer(serializers.ModelSerializer):
    course_title = serializers.CharField(source='course.title', read_only=True)
    is_live = serializers.SerializerMethodField()

    class Meta:
        model = Class
        fields = [
            'id', 'course', 'course_title', 'title', 'description',
            'class_type', 'status', 'scheduled_start', 'scheduled_end',
            'duration_minutes', 'location', 'meeting_url', 'recording_link',
            'max_students', 'enrolled_count', 'is_live', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'enrolled_count']

    def get_is_live(self, obj):
        return obj.is_live_now()


class ClassDetailSerializer(ClassSerializer):
    enrolled_students = serializers.PrimaryKeyRelatedField(many=True, read_only=True)

    class Meta(ClassSerializer.Meta):
        fields = ClassSerializer.Meta.fields + ['enrolled_students']
