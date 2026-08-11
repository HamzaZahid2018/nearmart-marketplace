from rest_framework import serializers
from django.contrib.auth import get_user_model, authenticate
from apps.users.models import Address

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """
    Serializer to display and update user profiles.
    """
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role', 'phone_number', 'date_joined']
        read_only_fields = ['id', 'username', 'role', 'date_joined']


class UserAdminSerializer(serializers.ModelSerializer):
    """
    Serializer to display users to admins. Includes is_active to show blocked status.
    """
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role', 'phone_number', 'is_active', 'date_joined']
        read_only_fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role', 'phone_number', 'date_joined']


class RegisterSerializer(serializers.ModelSerializer):
    """
    Serializer to register new Customer or Merchant accounts.
    """
    password = serializers.CharField(write_only=True, min_length=8, style={'input_type': 'password'}, error_messages={'min_length': 'Password must be at least 8 characters long.'})

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password', 'first_name', 'last_name', 'role', 'phone_number']
        read_only_fields = ['id']

    def validate_role(self, value):
        if value == 'owner':
            return User.Role.MERCHANT
        if value not in [User.Role.CUSTOMER, User.Role.MERCHANT, User.Role.ADMIN]:
            raise serializers.ValidationError("Role must be either customer, merchant, or admin.")
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            role=validated_data.get('role', User.Role.CUSTOMER),
            phone_number=validated_data.get('phone_number', None)
        )
        return user


class LoginSerializer(serializers.Serializer):
    """
    Serializer to validate user credentials and return a session token/context.
    """
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        username_or_email = str(data.get('username', '')).strip()
        password = data.get('password')

        if username_or_email and password:
            user = authenticate(username=username_or_email, password=password)
            if not user and '@' in username_or_email:
                try:
                    user_obj = User.objects.get(email__iexact=username_or_email)
                    user = authenticate(username=user_obj.username, password=password)
                except User.DoesNotExist:
                    pass

            if not user:
                raise serializers.ValidationError("Invalid credentials. Please check your username/email or password.")
            if not user.is_active:
                raise serializers.ValidationError("This account has been disabled by platform administration.")
            data['user'] = user
        else:
            raise serializers.ValidationError("Must provide both username/email and password.")
        return data


class AddressSerializer(serializers.ModelSerializer):
    """
    Serializer to manage customer delivery addresses.
    """
    class Meta:
        model = Address
        fields = ['id', 'user', 'title', 'street_address', 'city', 'state', 'zip_code', 'is_default', 'created_at']
        read_only_fields = ['id', 'user', 'created_at']

    def create(self, validated_data):
        # Automatically assign the request user as the address owner
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)
