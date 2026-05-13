from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404

from .models import ContentReport, ModerationLog
from .serializers import ContentReportSerializer


class ContentReportViewSet(viewsets.ModelViewSet):
    queryset = ContentReport.objects.all()
    serializer_class = ContentReportSerializer
    filterset_fields = ['status', 'reason']
    ordering = ['-created_at']

    def get_permissions(self):
        if self.action == 'create':
            return [IsAuthenticated()]
        # List/retrieve/resolve — admin only
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return ContentReport.objects.all().select_related('reporter', 'course', 'reported_user')
        return ContentReport.objects.filter(reporter=user)

    def perform_create(self, serializer):
        serializer.save(reporter=self.request.user)

    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        if request.user.role != 'admin':
            return Response({'detail': 'Admin only.'}, status=403)
        report = self.get_object()
        new_status = request.data.get('status', 'reviewed')
        notes      = request.data.get('notes', '')
        report.resolve(request.user, new_status, notes)
        ModerationLog.objects.create(
            admin=request.user, action='report_resolved',
            notes=notes, report=report,
        )
        return Response(self.get_serializer(report).data)


class CourseModerateView(APIView):
    """Admin-only: approve, reject, or suspend a course."""
    permission_classes = [IsAuthenticated]

    def post(self, request, course_id):
        if request.user.role != 'admin':
            return Response({'detail': 'Admin only.'}, status=403)

        from apps.courses.models import Course
        course = get_object_or_404(Course, pk=course_id)
        action_type = request.data.get('action')
        reason      = request.data.get('reason', '')

        if action_type == 'approve':
            course.approve(request.user)
            log_action = 'approve'
        elif action_type == 'reject':
            course.reject(request.user, reason)
            log_action = 'reject'
        elif action_type == 'suspend':
            course.suspend(request.user, reason)
            log_action = 'suspend'
        elif action_type == 'restore':
            course.moderation_status = 'approved'
            course.is_published = True
            course.save(update_fields=['moderation_status', 'is_published'])
            log_action = 'restore'
        else:
            return Response({'detail': 'Invalid action. Use: approve/reject/suspend/restore.'}, status=400)

        ModerationLog.objects.create(
            admin=request.user, action=log_action,
            notes=reason, course=course,
        )
        return Response({
            'detail': f'Course {action_type}d.',
            'moderation_status': course.moderation_status,
            'is_published': course.is_published,
        })


class ModerationQueueView(APIView):
    """Admin-only: list courses pending review."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'admin':
            return Response({'detail': 'Admin only.'}, status=403)
        from apps.courses.models import Course
        from apps.courses.serializers import CourseSerializer
        pending = Course.objects.filter(
            moderation_status='pending_review'
        ).select_related('tutor').order_by('created_at')
        return Response(CourseSerializer(pending, many=True, context={'request': request}).data)
