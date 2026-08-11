from django.core.mail import send_mail
from django.conf import settings
from apps.interactions.models import Notification

def notify_user(user, title, message, notification_type=Notification.Type.SYSTEM, send_email=True):
    """
    Creates an in-app notification and optionally sends an email.
    """
    # 1. Create In-App Notification
    notification = Notification.objects.create(
        user=user,
        title=title,
        message=message,
        notification_type=notification_type
    )
    
    # 2. Send Email Notification
    if send_email and user.email:
        try:
            send_mail(
                subject=title,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=True,
            )
        except Exception as e:
            print(f"Failed to send email to {user.email}: {e}")
            
    return notification
