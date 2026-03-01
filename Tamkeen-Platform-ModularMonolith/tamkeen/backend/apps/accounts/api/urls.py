from django.urls import path
from . import views
urlpatterns = [
    path("me/", views.current_user, name="current-user"),
    path("users/", views.user_list, name="user-list"),
]
