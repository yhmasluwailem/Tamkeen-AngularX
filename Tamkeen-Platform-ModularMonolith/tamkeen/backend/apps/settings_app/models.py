from django.db import models
from shared.mixins.base import TimeStampedModel

class SystemSetting(TimeStampedModel):
    key = models.CharField(max_length=100, unique=True)
    value = models.JSONField()
    description = models.TextField(blank=True)
