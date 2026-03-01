"""
AI Engine Models
================
Stores AI analysis results, usage logs, budget controls,
and prompt template metadata for the Tamkeen legal AI engine.
"""

from django.db import models
from django.conf import settings
from shared.mixins.base import TimeStampedModel, AuditMixin


class AIAnalysis(TimeStampedModel, AuditMixin):
    """Stored result of every AI analysis — requires attorney review."""

    STATUS_CHOICES = [
        ("pending", "قيد التحليل"),
        ("completed", "اكتمل التحليل"),
        ("reviewed", "تمت المراجعة"),
        ("rejected", "مرفوض"),
        ("applied", "تم التطبيق"),
    ]

    case = models.ForeignKey(
        "cases.Case",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="ai_analyses",
    )
    document = models.ForeignKey(
        "documents.Document",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="ai_analyses",
    )
    action_id = models.CharField(max_length=50, db_index=True)
    params_hash = models.CharField(
        max_length=64, db_index=True, help_text="SHA256 of action params for cache lookup"
    )

    # Results — structured JSON
    findings = models.JSONField(default=list)
    missing_provisions = models.JSONField(default=list)
    risk_score = models.IntegerField(null=True, blank=True)
    executive_summary = models.TextField(blank=True)
    raw_response = models.JSONField(default=dict, help_text="Full Claude response for audit")

    # Token tracking
    model_used = models.CharField(max_length=50)
    input_tokens = models.IntegerField(default=0)
    output_tokens = models.IntegerField(default=0)
    cache_read_tokens = models.IntegerField(default=0)
    cache_creation_tokens = models.IntegerField(default=0)
    estimated_cost_usd = models.DecimalField(max_digits=10, decimal_places=6, default=0)

    # Attorney review workflow
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default="pending")
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="reviewed_analyses",
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    review_notes = models.TextField(blank=True)

    class Meta:
        verbose_name = "تحليل ذكي"
        verbose_name_plural = "التحليلات الذكية"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["case", "action_id"]),
            models.Index(fields=["params_hash"]),
            models.Index(fields=["status"]),
        ]

    def __str__(self):
        return f"{self.action_id} — {self.case_id or 'no case'}"


class AIUsageLog(TimeStampedModel):
    """Per-call usage tracking for cost control and analytics."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="ai_usage_logs"
    )
    action_id = models.CharField(max_length=50)
    model_used = models.CharField(max_length=50)
    input_tokens = models.IntegerField(default=0)
    output_tokens = models.IntegerField(default=0)
    cache_read_tokens = models.IntegerField(default=0)
    cache_creation_tokens = models.IntegerField(default=0)
    cost_usd = models.DecimalField(max_digits=10, decimal_places=6, default=0)
    success = models.BooleanField(default=True)
    error_message = models.TextField(blank=True)

    class Meta:
        verbose_name = "سجل استخدام AI"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "created_at"]),
            models.Index(fields=["action_id", "created_at"]),
        ]


class AIBudget(TimeStampedModel):
    """Configurable per-user and firm-wide AI budget limits."""

    SCOPE_CHOICES = [("firm", "المكتب"), ("user", "مستخدم")]

    scope = models.CharField(max_length=10, choices=SCOPE_CHOICES)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="ai_budgets",
    )
    monthly_limit_usd = models.DecimalField(max_digits=8, decimal_places=2, default=50.00)
    monthly_limit_calls = models.IntegerField(default=1000)
    alert_threshold_percent = models.IntegerField(default=80)
    action_limits = models.JSONField(
        default=dict, blank=True, help_text='Per-action limits, e.g. {"contract_review": 100}'
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = "ميزانية AI"
        constraints = [
            models.UniqueConstraint(
                fields=["scope", "user"],
                name="unique_budget_per_scope_user",
            )
        ]
