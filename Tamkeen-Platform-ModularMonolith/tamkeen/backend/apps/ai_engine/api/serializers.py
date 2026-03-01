"""
AI Engine Serializers
=====================
Strictly typed input serializers — no free-text fields.
Every AI interaction goes through predefined parameters only.
"""

from rest_framework import serializers


class ContractReviewSerializer(serializers.Serializer):
    """No free text — only structured params for contract review."""

    case_id = serializers.UUIDField()
    document_id = serializers.UUIDField()
    party_role = serializers.ChoiceField(choices=["client", "counterparty"])
    review_mode = serializers.ChoiceField(choices=["full", "risk_only", "compliance"])
    severity_filter = serializers.ChoiceField(choices=["all", "high_critical"])
    include_market_benchmark = serializers.BooleanField(default=False)
    include_missing_provisions = serializers.BooleanField(default=True)


class CounterAnalysisSerializer(serializers.Serializer):
    case_id = serializers.UUIDField()
    our_document_ids = serializers.ListField(child=serializers.UUIDField())
    counter_document_ids = serializers.ListField(child=serializers.UUIDField())
    party_role = serializers.ChoiceField(choices=["client", "counterparty"])
    focus_area = serializers.ChoiceField(
        choices=["all", "liability", "compensation", "termination", "compliance"]
    )


class DemandResponseSerializer(serializers.Serializer):
    case_id = serializers.UUIDField()
    document_id = serializers.UUIDField()
    party_role = serializers.ChoiceField(choices=["client", "counterparty"])
    case_type = serializers.CharField(max_length=50)
    deadline = serializers.CharField(max_length=50, required=False, default="")


class RiskAssessmentSerializer(serializers.Serializer):
    case_id = serializers.UUIDField(required=False)
    document_id = serializers.UUIDField()
    party_role = serializers.ChoiceField(choices=["client", "counterparty"])
    risk_categories = serializers.ChoiceField(
        choices=["all", "financial", "legal", "compliance", "operational"]
    )


class ProvisionCheckSerializer(serializers.Serializer):
    document_id = serializers.UUIDField()
    contract_type = serializers.ChoiceField(
        choices=[
            "employment",
            "service",
            "sale",
            "lease",
            "partnership",
            "investment",
            "nda",
            "other",
        ]
    )


class ClauseGenerateSerializer(serializers.Serializer):
    document_id = serializers.UUIDField()
    clause_text = serializers.CharField(max_length=2000)
    objective = serializers.ChoiceField(
        choices=["protect_client", "balanced", "reduce_liability", "add_protection"]
    )
    party_role = serializers.ChoiceField(choices=["client", "counterparty"])
    clause_type = serializers.ChoiceField(
        choices=[
            "termination",
            "liability",
            "indemnification",
            "non_compete",
            "confidentiality",
            "payment",
            "dispute_resolution",
            "other",
        ]
    )


class ComplianceCheckSerializer(serializers.Serializer):
    case_id = serializers.UUIDField(required=False)
    document_id = serializers.UUIDField()
    document_type = serializers.ChoiceField(
        choices=["contract", "policy", "agreement", "license", "registration"]
    )
    industry_sector = serializers.ChoiceField(
        choices=[
            "general",
            "banking",
            "insurance",
            "healthcare",
            "education",
            "construction",
            "technology",
            "retail",
        ]
    )
    regulatory_focus = serializers.ChoiceField(
        choices=["all", "pdpl", "labor", "commercial", "investment", "anti_ml"]
    )


class SummaryGenerateSerializer(serializers.Serializer):
    document_id = serializers.UUIDField()
    summary_type = serializers.ChoiceField(
        choices=["brief", "detailed", "key_terms", "obligations"]
    )
    language = serializers.ChoiceField(choices=["ar", "en", "both"], default="ar")


class CostEstimateSerializer(serializers.Serializer):
    action_id = serializers.ChoiceField(
        choices=[
            "contract_review",
            "counter_analysis",
            "demand_response",
            "risk_assessment",
            "provision_check",
            "clause_generate",
            "compliance_check",
            "summary_generate",
        ]
    )
    document_length = serializers.IntegerField(min_value=0)


class AnalysisReviewSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=["reviewed", "rejected"])
    review_notes = serializers.CharField(max_length=2000, required=False, default="")
