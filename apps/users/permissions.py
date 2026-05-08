from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsTutor(BasePermission):
    message = 'Only tutors and teachers can perform this action.'

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role in ('tutor', 'teacher', 'admin')
        )


class IsStudent(BasePermission):
    message = 'Only students can perform this action.'

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ('student', 'admin')


class IsEmailVerified(BasePermission):
    message = 'Please verify your email address before performing this action.'

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.email_verified


class IsCourseOwnerOrReadOnly(BasePermission):
    message = 'Only the course owner can modify this course.'

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        return obj.tutor == request.user or request.user.role == 'admin'


class IsEnrolledOrTutor(BasePermission):
    message = 'You must be enrolled in this course to perform this action.'

    def has_permission(self, request, view):
        return request.user.is_authenticated
