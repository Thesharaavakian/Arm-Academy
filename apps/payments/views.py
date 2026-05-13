from django.shortcuts import get_object_or_404
from django.conf import settings
from django.db.models import F
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.views import APIView

from apps.courses.models import Course, Class
from apps.ratings.models import Progress
from .models import Payment
from .serializers import PaymentSerializer


def _auto_enroll(student, course):
    """Create progress record and increment course student count."""
    progress, created = Progress.objects.get_or_create(
        student=student,
        course=course,
        defaults={'total_classes': Class.objects.filter(course=course).count()},
    )
    if created:
        Course.objects.filter(pk=course.pk).update(total_students=F('total_students') + 1)
    return progress


class InitiatePaymentView(APIView):
    """
    POST /api/payments/initiate/<course_id>/

    - Free course  → enroll directly (redirect to enroll endpoint)
    - Paid + Stripe configured → return Stripe Checkout URL
    - Paid + no Stripe → return manual payment request
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, course_id):
        course = get_object_or_404(Course, pk=course_id, is_published=True)

        if course.is_free:
            return Response({'detail': 'Course is free — use /enroll/ directly.'}, status=400)

        price = course.price_amd or 0
        if price <= 0:
            return Response({'detail': 'Course price not set. Contact the tutor.'}, status=400)

        # Block duplicate active/completed payments
        if Payment.objects.filter(student=request.user, course=course, status='completed').exists():
            return Response({'detail': 'Already paid and enrolled.'}, status=400)

        stripe_key = getattr(settings, 'STRIPE_SECRET_KEY', '')

        if stripe_key:
            return self._stripe_checkout(request, course, price)
        else:
            return self._manual_payment(request, course, price)

    def _stripe_checkout(self, request, course, price):
        import stripe
        stripe.api_key = settings.STRIPE_SECRET_KEY

        amount_in_luma = int(float(price) * 100)  # AMD → luma (1 AMD = 100 luma)

        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': settings.CURRENCY,
                    'product_data': {'name': course.title},
                    'unit_amount': amount_in_luma,
                },
                'quantity': 1,
            }],
            mode='payment',
            success_url=f'{settings.FRONTEND_URL}/courses/{course.pk}?payment=success',
            cancel_url=f'{settings.FRONTEND_URL}/courses/{course.pk}?payment=cancelled',
            metadata={'course_id': course.pk, 'user_id': request.user.pk},
            customer_email=request.user.email,
        )

        Payment.objects.create(
            student=request.user,
            course=course,
            amount_amd=price,
            stripe_checkout_session_id=session.id,
            status='pending',
        )

        return Response({'checkout_url': session.url, 'session_id': session.id})

    def _manual_payment(self, request, course, price):
        """No Stripe configured — create a pending payment for admin confirmation."""
        existing = Payment.objects.filter(
            student=request.user, course=course, status='pending'
        ).first()
        if not existing:
            existing = Payment.objects.create(
                student=request.user,
                course=course,
                amount_amd=price,
                status='pending',
            )
        return Response({
            'manual': True,
            'payment_id': existing.pk,
            'amount_amd': str(price),
            'tutor_name': course.tutor.display_name,
            'tutor_email': course.tutor.email,
            'detail': (
                f'Please transfer {price:,.0f} AMD to the tutor and send your '
                'proof of payment. Your enrollment will be confirmed within 24 hours.'
            ),
        })


class StripeWebhookView(APIView):
    """Stripe calls this after a successful payment."""
    permission_classes = [AllowAny]

    def post(self, request):
        import stripe
        stripe.api_key = settings.STRIPE_SECRET_KEY

        payload    = request.body
        sig_header = request.META.get('HTTP_STRIPE_SIGNATURE', '')

        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
            )
        except Exception:
            return Response(status=400)

        if event['type'] == 'checkout.session.completed':
            sess    = event['data']['object']
            payment = Payment.objects.filter(
                stripe_checkout_session_id=sess['id']
            ).first()

            if payment and payment.status != 'completed':
                payment.status = 'completed'
                payment.stripe_payment_intent_id = sess.get('payment_intent', '')
                payment.save()

                _auto_enroll(payment.student, payment.course)

                try:
                    from apps.users.tasks import send_payment_confirmation_task
                    send_payment_confirmation_task.delay(
                        payment.student.email,
                        payment.student.first_name,
                        payment.course.title,
                        float(payment.amount_amd),
                    )
                except Exception:
                    pass

        return Response(status=200)


class ConfirmManualPaymentView(APIView):
    """Admin endpoint to confirm a manual payment and enroll the student."""
    permission_classes = [IsAuthenticated]

    def post(self, request, payment_id):
        if request.user.role != 'admin':
            return Response({'detail': 'Admin only.'}, status=403)

        payment = get_object_or_404(Payment, pk=payment_id, status='pending')
        payment.status = 'completed'
        payment.notes = request.data.get('notes', '')
        payment.save()

        _auto_enroll(payment.student, payment.course)

        try:
            from apps.users.tasks import send_payment_confirmation_task
            send_payment_confirmation_task.delay(
                payment.student.email,
                payment.student.first_name,
                payment.course.title,
                float(payment.amount_amd),
            )
        except Exception:
            pass

        return Response({'detail': f'Payment confirmed and {payment.student.username} enrolled.'})


class MyPaymentsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        payments = Payment.objects.filter(student=request.user).select_related('course')
        return Response(PaymentSerializer(payments, many=True).data)
