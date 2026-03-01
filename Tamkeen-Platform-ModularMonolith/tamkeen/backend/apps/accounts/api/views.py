from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def current_user(request):
    u = request.user
    return Response({"id": str(u.id), "username": u.username, "name_ar": u.name_ar, "role": u.role, "email": u.email})

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def user_list(request):
    from apps.accounts.models import User
    users = User.objects.filter(is_active=True).values("id", "username", "name_ar", "role", "phone", "email", "title")
    return Response(list(users))
