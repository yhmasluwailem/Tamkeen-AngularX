from django.db import models
from django.conf import settings
from shared.mixins.base import TimeStampedModel, SoftDeleteModel, AuditMixin

class Case(TimeStampedModel, SoftDeleteModel, AuditMixin):
    STATUS_CHOICES = [
        ("active", "نشطة"), ("pending", "معلقة"), ("closed", "مغلقة"),
        ("archived", "مؤرشفة"), ("appealed", "مستأنفة"), ("suspended", "موقوفة"), ("settled", "تمت التسوية"),
    ]
    COURT_TYPES = [
        ("personal_status", "أحوال شخصية"), ("execution", "تنفيذ"),
        ("criminal", "جزائية"), ("general", "عامة"),
        ("commercial", "تجارية"), ("labor", "عمالية"),
    ]
    PARTY_ROLES = [("plaintiff", "مدعي"), ("defendant", "مدعى عليه")]
    title = models.CharField(max_length=500, verbose_name="عنوان القضية")
    description = models.TextField(blank=True)
    client = models.ForeignKey("clients.Client", on_delete=models.PROTECT, related_name="cases")
    assigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="assigned_cases")
    team_members = models.ManyToManyField(settings.AUTH_USER_MODEL, blank=True, related_name="team_cases")
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default="active")
    court_type = models.CharField(max_length=20, choices=COURT_TYPES)
    case_category = models.CharField(max_length=255)
    case_sub_category = models.CharField(max_length=255, blank=True)
    court_branch = models.CharField(max_length=255, blank=True)
    circle_number = models.CharField(max_length=50, blank=True)
    najiz_number = models.CharField(max_length=50, blank=True, verbose_name="رقم ناجز")
    party_role = models.CharField(max_length=15, choices=PARTY_ROLES, default="plaintiff")
    opponents = models.JSONField(default=list, blank=True)
    filing_date = models.DateField(null=True, blank=True)
    agency_expiry = models.DateField(null=True, blank=True)
    agreed_fee = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    paid_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tags = models.JSONField(default=list, blank=True)
    class Meta:
        verbose_name = "قضية"
    def __str__(self):
        return self.title

class Lead(TimeStampedModel, SoftDeleteModel, AuditMixin):
    STATUS_CHOICES = [
        ("intake", "استقبال"), ("consultation", "استشارة"), ("case_study", "دراسة"),
        ("fee_proposal", "عرض أتعاب"), ("engagement", "تعاقد"),
        ("converted", "تم التحويل"), ("declined", "مرفوض"), ("withdrawn", "منسحب"),
    ]
    name = models.CharField(max_length=255)
    phone = models.CharField(max_length=20)
    email = models.EmailField(blank=True)
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default="intake")
    source = models.CharField(max_length=50, blank=True)
    legal_issue_type = models.CharField(max_length=255, blank=True)
    issue_description = models.TextField(blank=True)
    assigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    converted_case = models.ForeignKey(Case, null=True, blank=True, on_delete=models.SET_NULL)
    class Meta:
        verbose_name = "فرصة"
