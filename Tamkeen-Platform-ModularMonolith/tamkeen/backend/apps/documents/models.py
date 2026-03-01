from django.db import models
from shared.mixins.base import TimeStampedModel, SoftDeleteModel, AuditMixin

class Document(TimeStampedModel, SoftDeleteModel, AuditMixin):
    CATEGORIES = [
        ("contracts","عقود"),("pleadings","لوائح"),("judgments","أحكام"),
        ("agencies","وكالات"),("identities","هويات"),("evidence","بيّنات"),
        ("invoices","فواتير"),("receipts","إيصالات"),("other","أخرى"),
    ]
    title = models.CharField(max_length=255)
    category = models.CharField(max_length=20, choices=CATEGORIES)
    status = models.CharField(max_length=20, default="uploaded")
    file = models.FileField(upload_to="documents/")
    file_name = models.CharField(max_length=255)
    file_size = models.PositiveBigIntegerField(default=0)
    case = models.ForeignKey("cases.Case", null=True, blank=True, on_delete=models.CASCADE, related_name="documents")
    client = models.ForeignKey("clients.Client", null=True, blank=True, on_delete=models.CASCADE, related_name="documents")
    task = models.ForeignKey("tasks.Task", null=True, blank=True, on_delete=models.SET_NULL)
    expiry_date = models.DateField(null=True, blank=True)
