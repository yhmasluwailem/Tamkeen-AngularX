from django.db import models
from shared.mixins.base import TimeStampedModel, SoftDeleteModel, AuditMixin

class Client(TimeStampedModel, SoftDeleteModel, AuditMixin):
    TYPE_CHOICES = [("individual", "فرد"), ("corporate", "شركة")]
    ID_TYPE_CHOICES = [
        ("national_id", "هوية وطنية"), ("iqama", "إقامة"),
        ("commercial_reg", "سجل تجاري"), ("passport", "جواز سفر"),
        ("government_id", "هوية حكومية"),
    ]
    name = models.CharField(max_length=255, verbose_name="الاسم")
    name_en = models.CharField(max_length=255, blank=True)
    client_type = models.CharField(max_length=15, choices=TYPE_CHOICES, default="individual")
    id_type = models.CharField(max_length=20, choices=ID_TYPE_CHOICES, default="national_id")
    id_number = models.CharField(max_length=30, unique=True, verbose_name="رقم الهوية")
    phone = models.CharField(max_length=20)
    email = models.EmailField(blank=True)
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    region = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)
    whatsapp_opt_in = models.BooleanField(default=False)
    tags = models.JSONField(default=list, blank=True)
    rating = models.PositiveIntegerField(null=True, blank=True)
    class Meta:
        verbose_name = "عميل"
    def __str__(self):
        return self.name

class Communication(TimeStampedModel):
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name="communications")
    channel = models.CharField(max_length=20)
    direction = models.CharField(max_length=10)
    subject = models.CharField(max_length=255, blank=True)
    content = models.TextField()
