from rest_framework import viewsets, generics, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.exceptions import TokenError
from django.contrib.auth import get_user_model
from .serializers import UserSerializer, UserDetailSerializer, UserRegistrationSerializer

User = get_user_model()


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['role'] = user.role
        token['email'] = user.email
        token['full_name'] = user.get_full_name() or user.username
        return token


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = [AllowAny]
    serializer_class = UserRegistrationSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        refresh['role'] = user.role
        refresh['email'] = user.email
        refresh['full_name'] = user.get_full_name() or user.username
        return Response({
            'user': UserDetailSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }
        }, status=status.HTTP_201_CREATED)


class LogoutView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            token = RefreshToken(request.data.get('refresh', ''))
            token.blacklist()
        except TokenError:
            pass
        return Response({'detail': 'Logged out successfully.'})


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer

    def get_permissions(self):
        if self.action == 'create':
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_serializer_class(self):
        if self.action in ['retrieve', 'profile']:
            return UserDetailSerializer
        if self.action == 'create':
            return UserRegistrationSerializer
        return UserSerializer

    @action(detail=False, methods=['get', 'patch'])
    def profile(self, request):
        user = request.user
        if request.method == 'PATCH':
            serializer = UserDetailSerializer(user, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)
        return Response(UserDetailSerializer(user).data)

    @action(detail=True, methods=['get'])
    def courses(self, request, pk=None):
        from apps.courses.models import Course
        from apps.courses.serializers import CourseSerializer
        user = self.get_object()
        courses = Course.objects.filter(tutor=user)
        return Response(CourseSerializer(courses, many=True).data)

    @action(detail=True, methods=['get'])
    def reviews(self, request, pk=None):
        from apps.ratings.models import Review
        from apps.ratings.serializers import ReviewSerializer
        user = self.get_object()
        reviews = Review.objects.filter(tutor=user)
        return Response(ReviewSerializer(reviews, many=True).data)
