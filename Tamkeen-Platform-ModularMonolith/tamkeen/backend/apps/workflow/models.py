from django.db import models
from django.conf import settings
from shared.mixins.base import TimeStampedModel, SoftDeleteModel, AuditMixin

class WorkflowTemplate(TimeStampedModel, AuditMixin):
    """قالب سير العمل الموحّد — نسخة واحدة لكل القضايا"""
    name = models.CharField(max_length=255, default="المسار الموحّد للقضايا")
    version = models.PositiveIntegerField(default=1)
    is_active = models.BooleanField(default=True)
    description = models.TextField(blank=True)
    class Meta:
        verbose_name = "قالب سير العمل"

class StageTemplate(TimeStampedModel):
    """تعريف مرحلة في القالب"""
    STAGE_KEYS = [
        ("registration", "تسجيل القضية"), ("pleading", "إعداد اللائحة"),
        ("filing", "رفع الدعوى"), ("hearings", "الجلسات"),
        ("judgment", "الحكم"), ("appeal", "الاستئناف"),
        ("execution", "التنفيذ"), ("closure", "إقفال القضية"),
    ]
    workflow_template = models.ForeignKey(WorkflowTemplate, on_delete=models.CASCADE, related_name="stages")
    stage_key = models.CharField(max_length=30, choices=STAGE_KEYS)
    name_ar = models.CharField(max_length=100)
    order = models.PositiveIntegerField()
    icon = models.CharField(max_length=50, default="bi-circle")
    color = models.CharField(max_length=10, default="#64748b")
    expected_duration_days = models.PositiveIntegerField(default=7)
    default_owner_role = models.CharField(max_length=20, blank=True)
    class Meta:
        ordering = ["order"]
        verbose_name = "مرحلة (قالب)"

class GateConditionTemplate(TimeStampedModel):
    """شرط بوابة في القالب"""
    CONDITION_TYPES = [
        ("field_filled", "حقل مكتمل"), ("document_uploaded", "مستند مرفق"),
        ("approval_obtained", "اعتماد محصّل"), ("task_completed", "مهمة منجزة"),
        ("payment_received", "دفعة مستلمة"), ("custom", "شرط مخصص"),
    ]
    stage_template = models.ForeignKey(StageTemplate, on_delete=models.CASCADE, related_name="gate_conditions")
    condition_type = models.CharField(max_length=30, choices=CONDITION_TYPES)
    label = models.CharField(max_length=255)
    is_required = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)
    class Meta:
        ordering = ["order"]

class TaskTemplate(TimeStampedModel):
    """مهمة تلقائية تُنشأ عند دخول مرحلة"""
    stage_template = models.ForeignKey(StageTemplate, on_delete=models.CASCADE, related_name="auto_tasks")
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    default_assignee_role = models.CharField(max_length=20, blank=True)
    priority = models.CharField(max_length=10, default="medium")
    is_gate_condition = models.BooleanField(default=False)

class CaseWorkflow(TimeStampedModel, SoftDeleteModel):
    """نسخة سير عمل مرتبطة بقضية محددة"""
    case = models.OneToOneField("cases.Case", on_delete=models.CASCADE, related_name="workflow")
    template = models.ForeignKey(WorkflowTemplate, on_delete=models.PROTECT)
    template_version = models.PositiveIntegerField()
    current_stage_key = models.CharField(max_length=30, default="registration")
    progress_percentage = models.PositiveIntegerField(default=0)
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    class Meta:
        verbose_name = "سير عمل القضية"

class StageInstance(TimeStampedModel):
    """حالة مرحلة فعلية لقضية"""
    STATUS_CHOICES = [("locked", "مقفلة"), ("active", "نشطة"), ("completed", "مكتملة"), ("skipped", "تم تجاوزها")]
    workflow = models.ForeignKey(CaseWorkflow, on_delete=models.CASCADE, related_name="stages")
    stage_key = models.CharField(max_length=30)
    name_ar = models.CharField(max_length=100)
    order = models.PositiveIntegerField()
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default="locked")
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    entered_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    expected_duration_days = models.PositiveIntegerField(default=7)
    icon = models.CharField(max_length=50, default="bi-circle")
    color = models.CharField(max_length=10, default="#64748b")
    class Meta:
        ordering = ["order"]

class GateConditionInstance(TimeStampedModel):
    """شرط بوابة فعلي لمرحلة قضية"""
    stage = models.ForeignKey(StageInstance, on_delete=models.CASCADE, related_name="gate_conditions")
    condition_type = models.CharField(max_length=30)
    label = models.CharField(max_length=255)
    is_required = models.BooleanField(default=True)
    is_met = models.BooleanField(default=False)
    met_at = models.DateTimeField(null=True, blank=True)
    met_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)

class StageTransitionLog(TimeStampedModel):
    """سجل انتقالات المراحل"""
    workflow = models.ForeignKey(CaseWorkflow, on_delete=models.CASCADE, related_name="transitions")
    from_stage = models.CharField(max_length=30)
    to_stage = models.CharField(max_length=30)
    transition_type = models.CharField(max_length=20, default="advance")
    performed_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL)
    notes = models.TextField(blank=True)

class CaseExceptionExit(TimeStampedModel, AuditMixin):
    """خروج استثنائي من المسار"""
    EXIT_TYPES = [("settlement", "صلح"), ("withdrawal", "انسحاب"), ("dismissal", "شطب"), ("suspension", "تعليق")]
    workflow = models.ForeignKey(CaseWorkflow, on_delete=models.CASCADE, related_name="exception_exits")
    exit_type = models.CharField(max_length=20, choices=EXIT_TYPES)
    reason = models.TextField()
    exit_date = models.DateField()
