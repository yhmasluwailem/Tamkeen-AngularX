from django.db import models
from django.conf import settings
from shared.mixins.base import TimeStampedModel, AuditMixin

class Session(TimeStampedModel, AuditMixin):
    STATUS_CHOICES = [("scheduled","مجدولة"),("completed","منعقدة"),("cancelled","ملغاة"),("postponed","مؤجلة")]
    case = models.ForeignKey("cases.Case", on_delete=models.CASCADE, related_name="sessions")
    title = models.CharField(max_length=255)
    date = models.DateField()
    time = models.TimeField()
    session_type = models.CharField(max_length=50, default="hearing")
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default="scheduled")
    location = models.CharField(max_length=255, blank=True)
    attendees = models.ManyToManyField(settings.AUTH_USER_MODEL, blank=True)
    notes = models.TextField(blank=True)
    outcome = models.TextField(blank=True)
    next_session_date = models.DateField(null=True, blank=True)
