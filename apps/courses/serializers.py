from rest_framework import serializers
from .models import Course, Class, Section


class SectionSerializer(serializers.ModelSerializer):
    class_count = serializers.SerializerMethodField()

    class Meta:
        model  = Section
        fields = ['id', 'course', 'title', 'description', 'order', 'class_count']
        read_only_fields = ['id']

    def get_class_count(self, obj):
        return obj.classes.count()


class CourseSerializer(serializers.ModelSerializer):
    tutor_name  = serializers.SerializerMethodField()
    is_enrolled = serializers.SerializerMethodField()
    is_owner    = serializers.SerializerMethodField()

    class Meta:
        model  = Course
        fields = [
            'id', 'title', 'description', 'tutor', 'tutor_name',
            'cover_image', 'trailer_url', 'category', 'level', 'language', 'tags',
            'is_free', 'price_amd', 'subscription_required',
            'total_students', 'average_rating', 'total_reviews',
            'total_lectures', 'total_duration_minutes',
            'is_published', 'content_rating', 'moderation_status', 'rejection_reason',
            'requirements', 'what_you_learn',
            'is_enrolled', 'is_owner',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'tutor', 'created_at', 'updated_at',
            'total_students', 'average_rating', 'total_reviews',
            'total_lectures', 'total_duration_minutes',
            'moderation_status', 'moderated_by', 'moderated_at', 'rejection_reason',
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
    course_title  = serializers.CharField(source='course.title', read_only=True)
    section_title = serializers.CharField(source='section.title', read_only=True, default=None)
    is_live       = serializers.SerializerMethodField()
    has_video     = serializers.SerializerMethodField()
    is_accessible = serializers.SerializerMethodField()

    class Meta:
        model  = Class
        fields = [
            'id', 'course', 'course_title', 'section', 'section_title',
            'title', 'description', 'order',
            'class_type', 'status', 'is_preview',
            'scheduled_start', 'scheduled_end', 'duration_minutes',
            'location', 'meeting_url', 'recording_link',
            'max_students', 'enrolled_count',
            'is_live', 'has_video', 'is_accessible',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'enrolled_count']

    def get_is_live(self, obj):
        return obj.is_live_now()

    def get_has_video(self, obj):
        return hasattr(obj, 'video') and obj.video is not None

    def get_is_accessible(self, obj):
        request = self.context.get('request')
        if not request:
            return obj.is_preview
        return obj.is_accessible_to(request.user)


class ClassDetailSerializer(ClassSerializer):
    enrolled_students = serializers.PrimaryKeyRelatedField(many=True, read_only=True)

    class Meta(ClassSerializer.Meta):
        fields = ClassSerializer.Meta.fields + ['enrolled_students']
