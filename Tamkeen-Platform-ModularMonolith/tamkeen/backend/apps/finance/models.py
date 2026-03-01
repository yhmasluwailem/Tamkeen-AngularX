from django.db import models
from shared.mixins.base import TimeStampedModel, SoftDeleteModel, AuditMixin

class Invoice(TimeStampedModel, SoftDeleteModel, AuditMixin):
    STATUS_CHOICES = [("draft","مسودة"),("issued","صادرة"),("paid","مدفوعة"),("partially_paid","مدفوعة جزئياً"),("overdue","متأخرة"),("cancelled","ملغاة")]
    invoice_number = models.CharField(max_length=30, unique=True)
    client = models.ForeignKey("clients.Client", on_delete=models.PROTECT, related_name="invoices")
    case = models.ForeignKey("cases.Case", null=True, blank=True, on_delete=models.SET_NULL)
    total = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")
    paid_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    issue_date = models.DateField()
    due_date = models.DateField()
    notes = models.TextField(blank=True)

class InvoiceItem(TimeStampedModel):
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name="items")
    description = models.CharField(max_length=500)
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    total = models.DecimalField(max_digits=12, decimal_places=2)

class Expense(TimeStampedModel, SoftDeleteModel, AuditMixin):
    title = models.CharField(max_length=255)
    category = models.CharField(max_length=100)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    date = models.DateField()
    case = models.ForeignKey("cases.Case", null=True, blank=True, on_delete=models.SET_NULL)
    status = models.CharField(max_length=20, default="pending")
    receipt = models.FileField(upload_to="receipts/", blank=True)

class FinancialTransaction(TimeStampedModel):
    TYPES = [("income","إيراد"),("expense","مصروف"),("transfer","تحويل")]
    transaction_type = models.CharField(max_length=15, choices=TYPES)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    description = models.CharField(max_length=500)
    reference_type = models.CharField(max_length=20, blank=True)
    reference_id = models.UUIDField(null=True, blank=True)
    date = models.DateField()
