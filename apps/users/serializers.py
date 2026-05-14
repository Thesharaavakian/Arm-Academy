from rest_framework import serializers
from .models import CustomUser


class UserSerializer(serializers.ModelSerializer):
    display_name = serializers.CharField(read_only=True)

    class Meta:
        model = CustomUser
        # email, phone_number, paypal_me_link omitted — private; only in UserDetailSerializer (owner/admin)
        fields = [
            'id', 'username', 'first_name', 'last_name', 'display_name',
            'role', 'bio', 'profile_picture', 'is_verified',
            'expertise_areas', 'hourly_rate', 'average_rating',
            'total_reviews', 'total_students',
            'email_verified', 'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at',
            'average_rating', 'total_reviews', 'total_students',
            'email_verified', 'phone_verified', 'two_fa_enabled',
        ]


class UserDetailSerializer(serializers.ModelSerializer):
    display_name = serializers.CharField(read_only=True)

    class Meta:
        model = CustomUser
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'display_name',
            'role', 'bio', 'profile_picture', 'is_verified',
            'expertise_areas', 'hourly_rate', 'average_rating',
            'total_reviews', 'total_students', 'phone_number',
            'email_verified', 'phone_verified', 'two_fa_enabled',
            'paypal_me_link',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at',
            'average_rating', 'total_reviews', 'total_students',
            'email_verified', 'phone_verified', 'two_fa_enabled',
        ]


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password2 = serializers.CharField(write_only=True)

    class Meta:
        model = CustomUser
        fields = ['username', 'email', 'first_name', 'last_name', 'password', 'password2', 'role']

    def validate_email(self, value):
        if CustomUser.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('An account with this email already exists.')
        return value.lower()

    def validate_role(self, value):
        if value not in ('student', 'tutor', 'teacher'):
            raise serializers.ValidationError('Invalid role.')
        return value

    def validate(self, data):
        if data['password'] != data.pop('password2'):
            raise serializers.ValidationError({'password2': 'Passwords do not match.'})
        return data

    def create(self, validated_data):
        return CustomUser.objects.create_user(**validated_data)
