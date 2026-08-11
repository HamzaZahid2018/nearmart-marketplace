from rest_framework.authentication import TokenAuthentication
from rest_framework import exceptions

class BearerOrTokenAuthentication(TokenAuthentication):
    """
    Custom Token Authentication class that accepts both 'Bearer' and 'Token' header prefixes.
    """
    def authenticate(self, request):
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        if not auth_header:
            return None

        auth = auth_header.split()
        if not auth:
            return None

        prefix = auth[0].lower()
        if prefix in ['bearer', 'token']:
            if len(auth) == 1:
                msg = 'Invalid token header. No credentials provided.'
                raise exceptions.AuthenticationFailed(msg)
            elif len(auth) > 2:
                msg = 'Invalid token header. Token string should not contain spaces.'
                raise exceptions.AuthenticationFailed(msg)

            return self.authenticate_credentials(auth[1])

        return super().authenticate(request)
