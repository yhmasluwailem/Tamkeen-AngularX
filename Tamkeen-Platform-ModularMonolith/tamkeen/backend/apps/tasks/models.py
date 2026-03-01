from django.db import models
from django.conf import settings
from shared.mixins.base import TimeStampedModel, SoftDeleteModel, AuditMixin

class Task(TimeStampedModel, SoftDeleteModel, AuditMixin):
    """مهمة — نظام Branch & Merge"""
    STATUS_CHOICES = [
        ("pending", "بانتظار"), ("in_progress", "قيد التنفيذ"),
        ("submitted", "مسلّمة"), ("under_review", "تحت المراجعة"),
        ("returned", "مُرجعة"), ("approved", "معتمدة"),
        ("completed", "مكتملة"), ("cancelled", "ملغاة"),
    ]
    PRIORITY_CHOICES = [("low", "منخفضة"), ("medium", "متوسطة"), ("high", "عالية"), ("critical", "حرجة")]
    CONTEXT_TYPES = [("case", "قضية"), ("lead", "فرصة"), ("financial", "مالية")]

    title = models.CharField(max_length=500)
    description = models.TextField(blank=True)
    context_type = models.CharField(max_length=15, choices=CONTEXT_TYPES, default="case")
    case = models.ForeignKey("cases.Case", null=True, blank=True, on_delete=models.CASCADE, related_name="tasks")
    lead = models.ForeignKey("cases.Lead", null=True, blank=True, on_delete=models.CASCADE, related_name="tasks")
    stage_instance = models.ForeignKey("workflow.StageInstance", null=True, blank=True, on_delete=models.SET_NULL)

    is_auto_generated = models.BooleanField(default=False)
    is_gate_condition = models.BooleanField(default=False)

    # Branch & Merge
    assigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="assigned_tasks")
    assigned_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="delegated_tasks")
    reviewed_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="reviewed_tasks")

    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default="pending")
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default="medium")
    due_date = models.DateField(null=True, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    work_notes = models.TextField(blank=True, verbose_name="ملاحظات الموظف")
    review_notes = models.TextField(blank=True, verbose_name="ملاحظات المدير")
    completion_percentage = models.PositiveIntegerField(default=0)
    return_count = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = "مهمة"
        ordering = ["-created_at"]

    def __str__(self):
        return self.title

class TaskRevision(TimeStampedModel):
    """سجل مراجعات المهمة — مثل Git commits"""
    REVISION_TYPES = [("submitted", "تسليم"), ("returned", "إرجاع"), ("approved", "اعتماد")]
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="revisions")
    revision_number = models.PositiveIntegerField()
    revision_type = models.CharField(max_length=15, choices=REVISION_TYPES)
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    notes = models.TextField(blank=True)
    class Meta:
        ordering = ["revision_number"]

class TaskComment(TimeStampedModel):
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="comments")
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    content = models.TextField()
    parent = models.ForeignKey("self", null=True, blank=True, on_delete=models.CASCADE, related_name="replies")
