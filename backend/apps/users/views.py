from rest_framework import status, viewsets, permissions, generics, filters
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from django.contrib.auth import get_user_model
from django.utils import timezone
from apps.users.models import Address
from apps.users.serializers import (
    UserSerializer,
    RegisterSerializer,
    LoginSerializer,
    AddressSerializer,
    UserAdminSerializer
)
from apps.users.permissions import IsOwnerOrAdmin

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    """
    Endpoint for new user registration. Returns user details and an auth token.
    """
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        token, _ = Token.objects.get_or_create(user=user)
        return Response({
            "token": token.key,
            "user": UserSerializer(user).data
        }, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    """
    Endpoint for user authentication. Returns auth token and user profile details.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        token, _ = Token.objects.get_or_create(user=user)
        return Response({
            "token": token.key,
            "user": UserSerializer(user).data
        }, status=status.HTTP_200_OK)


class UserProfileView(generics.RetrieveUpdateAPIView):
    """
    Retrieve or update the authenticated user's profile details.
    """
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class AddressViewSet(viewsets.ModelViewSet):
    """
    CRUD viewset for User delivery addresses.
    Only returns and mutates addresses belonging to the authenticated user.
    """
    serializer_class = AddressSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrAdmin]

    def get_queryset(self):
        # Exclude soft-deleted addresses
        return Address.objects.filter(user=self.request.user, is_deleted=False)

    def perform_create(self, serializer):
        # Save address and manage default address flag constraints
        is_default = serializer.validated_data.get('is_default', False)
        if is_default:
            Address.objects.filter(user=self.request.user).update(is_default=False)
        serializer.save(user=self.request.user)

    def perform_update(self, serializer):
        is_default = serializer.validated_data.get('is_default', False)
        if is_default:
            Address.objects.filter(user=self.request.user).update(is_default=False)
        serializer.save()

    def perform_destroy(self, instance):
        # Perform soft delete
        instance.is_deleted = True
        instance.deleted_at = timezone.now()
        instance.save()


class UserViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Admin ViewSet to manage users.
    """
    queryset = User.objects.all().order_by('-date_joined')
    serializer_class = UserAdminSerializer
    permission_classes = [permissions.IsAdminUser]
    filter_backends = [filters.SearchFilter]
    search_fields = ['username', 'email', 'first_name', 'last_name']

    @action(detail=True, methods=['post'])
    def toggle_block(self, request, pk=None):
        """
        POST /api/users/users/{id}/toggle_block/
        """
        user = self.get_object()
        if user == request.user:
            return Response({"error": "You cannot block yourself."}, status=status.HTTP_400_BAD_REQUEST)
            
        user.is_active = not user.is_active
        user.save()
        
        return Response(UserAdminSerializer(user).data, status=status.HTTP_200_OK)
