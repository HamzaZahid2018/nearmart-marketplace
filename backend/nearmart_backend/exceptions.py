from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
import logging

logger = logging.getLogger(__name__)

def custom_exception_handler(exc, context):
    """
    Centralized exception handler that reformats all errors into a standard JSON shape.
    """
    # Call REST framework's default exception handler first,
    # to get the standard error response.
    response = exception_handler(exc, context)

    if response is not None:
        custom_response_data = {
            'error': True,
            'message': 'An error occurred.',
            'status_code': response.status_code,
            'details': response.data
        }

        # Extract a better top-level message if possible
        if isinstance(response.data, dict) and 'detail' in response.data:
            custom_response_data['message'] = response.data.pop('detail')
        elif isinstance(response.data, list) and len(response.data) > 0 and isinstance(response.data[0], str):
            custom_response_data['message'] = response.data[0]
        else:
            custom_response_data['message'] = 'Validation failed.'

        response.data = custom_response_data
    else:
        # Unhandled exceptions (500)
        logger.error(f"Unhandled Exception: {exc}", exc_info=True)
        return Response({
            'error': True,
            'message': 'Internal Server Error. Please try again later.',
            'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR,
            'details': str(exc)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    return response
