from django.contrib.auth.models import AbstractUser
from django.db import models
import uuid

class User(AbstractUser):
    ROLE_CHOICES = [
        ("admin", "مدير النظام"),
        ("senior_lawyer", "محامي أول"),
        ("lawyer", "محامي"),
        ("paralegal", "مساعد قانوني"),
        ("secretary", "سكرتير"),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name_ar = models.CharField(max_length=255, verbose_name="الاسم بالعربي")
    name_en = models.CharField(max_length=255, blank=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="lawyer")
    phone = models.CharField(max_length=20, blank=True)
    title = models.CharField(max_length=100, blank=True, verbose_name="المسمى الوظيفي")
    avatar_url = models.URLField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = "مستخدم"
        verbose_name_plural = "المستخدمون"

    def __str__(self):
        return self.name_ar or self.username

    @property
    def is_manager(self):
        return self.role in ("admin", "senior_lawyer")
