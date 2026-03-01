from django.db import models
from django.conf import settings
from shared.mixins.base import TimeStampedModel

class Comment(TimeStampedModel):
    CONTEXT_TYPES = [("case","قضية"),("lead","فرصة"),("task","مهمة"),("financial","مالية")]
    content = models.TextField()
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    context_type = models.CharField(max_length=15, choices=CONTEXT_TYPES)
    entity_id = models.UUIDField()
    parent = models.ForeignKey("self", null=True, blank=True, on_delete=models.CASCADE, related_name="replies")
    mentions = models.JSONField(default=list, blank=True)

class Notification(TimeStampedModel):
    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications")
    title = models.CharField(max_length=255)
    body = models.TextField(blank=True)
    is_read = models.BooleanField(default=False)
    link = models.CharField(max_length=500, blank=True)
    notification_type = models.CharField(max_length=30, default="info")
