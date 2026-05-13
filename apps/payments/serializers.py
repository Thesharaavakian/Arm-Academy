from rest_framework import serializers
from .models import Payment


class PaymentSerializer(serializers.ModelSerializer):
    course_title  = serializers.CharField(source='course.title',  read_only=True)
    student_name  = serializers.CharField(source='student.display_name', read_only=True)

    class Meta:
        model  = Payment
        fields = [
            'id', 'student', 'student_name', 'course', 'course_title',
            'amount_amd', 'status', 'stripe_checkout_session_id',
            'notes', 'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'student', 'amount_amd', 'status',
            'stripe_checkout_session_id', 'stripe_payment_intent_id',
            'created_at', 'updated_at',
        ]
