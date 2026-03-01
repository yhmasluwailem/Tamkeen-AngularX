"""
AI Engine API Views
===================
Action-based endpoints — POST only, no free-text input.
Every endpoint validates structured params, runs AI analysis, returns typed results.
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone

from apps.cases.models import Case
from apps.documents.models import Document
from ..models import AIAnalysis, AIUsageLog
from ..router import execute, get_cost_estimate
from ..optimizer import check_budget
from ..templates.registry import get_available_actions
from .serializers import (
    ContractReviewSerializer,
    CounterAnalysisSerializer,
    DemandResponseSerializer,
    RiskAssessmentSerializer,
    ProvisionCheckSerializer,
    ClauseGenerateSerializer,
    ComplianceCheckSerializer,
    SummaryGenerateSerializer,
    CostEstimateSerializer,
    AnalysisReviewSerializer,
)


class BaseAIActionView(APIView):
    """Base class for all AI action endpoints."""

    serializer_class = None
    action_id = None

    def get_document_text(self, document):
        """Extract text content from a document for AI analysis."""
        # In production, implement proper text extraction (OCR, PDF parsing, etc.)
        # For now, return a placeholder that would be replaced with actual extraction
        try:
            if document.file:
                # Read text-based files directly
                content = document.file.read()
                document.file.seek(0)
                try:
                    return content.decode("utf-8")
                except UnicodeDecodeError:
                    return f"[Document: {document.title} — {document.file_name}]"
        except Exception:
            pass
        return f"[Document: {document.title}]"

    def post(self, request):
        ser = self.serializer_class(data=request.data)
        ser.is_valid(raise_exception=True)
        params = ser.validated_data

        # Get related objects
        case = None
        document = None

        if "case_id" in params:
            try:
                case = Case.objects.get(id=params["case_id"], is_deleted=False)
            except Case.DoesNotExist:
                return Response(
                    {"error": "القضية غير موجودة"}, status=status.HTTP_404_NOT_FOUND
                )

        if "document_id" in params:
            try:
                document = Document.objects.get(id=params["document_id"], is_deleted=False)
            except Document.DoesNotExist:
                return Response(
                    {"error": "المستند غير موجود"}, status=status.HTTP_404_NOT_FOUND
                )

        # Auto-detect court_type from case if not in params
        if case and "court_type" not in params:
            params["court_type"] = case.court_type

        # Extract document text
        doc_text = ""
        if document:
            doc_text = self.get_document_text(document)

        # Execute the AI analysis
        result = execute(
            action_id=self.action_id,
            params=params,
            user=request.user,
            case=case,
            document=document,
            document_text=doc_text,
        )

        if not result.get("success"):
            http_status = (
                status.HTTP_429_TOO_MANY_REQUESTS
                if "budget" in result
                else status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            return Response(result, status=http_status)

        return Response(result, status=status.HTTP_200_OK)


class ContractReviewView(BaseAIActionView):
    serializer_class = ContractReviewSerializer
    action_id = "contract_review"


class CounterAnalysisView(BaseAIActionView):
    serializer_class = CounterAnalysisSerializer
    action_id = "counter_analysis"

    def post(self, request):
        ser = self.serializer_class(data=request.data)
        ser.is_valid(raise_exception=True)
        params = ser.validated_data

        case = None
        if "case_id" in params:
            try:
                case = Case.objects.get(id=params["case_id"], is_deleted=False)
            except Case.DoesNotExist:
                return Response(
                    {"error": "القضية غير موجودة"}, status=status.HTTP_404_NOT_FOUND
                )

        # Gather texts from multiple documents
        our_texts = []
        for doc_id in params.get("our_document_ids", []):
            try:
                doc = Document.objects.get(id=doc_id, is_deleted=False)
                our_texts.append(self.get_document_text(doc))
            except Document.DoesNotExist:
                pass

        counter_texts = []
        for doc_id in params.get("counter_document_ids", []):
            try:
                doc = Document.objects.get(id=doc_id, is_deleted=False)
                counter_texts.append(self.get_document_text(doc))
            except Document.DoesNotExist:
                pass

        params["our_documents"] = "\n---\n".join(our_texts)
        params["counter_documents"] = "\n---\n".join(counter_texts)
        if case:
            params["court_type"] = case.court_type
            params["dispute_type"] = case.case_category

        result = execute(
            action_id=self.action_id,
            params=params,
            user=request.user,
            case=case,
            document_text="",
        )

        if not result.get("success"):
            return Response(result, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        return Response(result)


class DemandResponseView(BaseAIActionView):
    serializer_class = DemandResponseSerializer
    action_id = "demand_response"


class RiskAssessmentView(BaseAIActionView):
    serializer_class = RiskAssessmentSerializer
    action_id = "risk_assessment"


class ProvisionCheckView(BaseAIActionView):
    serializer_class = ProvisionCheckSerializer
    action_id = "provision_check"


class ClauseGenerateView(BaseAIActionView):
    serializer_class = ClauseGenerateSerializer
    action_id = "clause_generate"


class ComplianceCheckView(BaseAIActionView):
    serializer_class = ComplianceCheckSerializer
    action_id = "compliance_check"


class SummaryGenerateView(BaseAIActionView):
    serializer_class = SummaryGenerateSerializer
    action_id = "summary_generate"


# ─── Utility Endpoints ──────────────────────────────────────


class CostEstimateView(APIView):
    """Estimate cost of an AI action before execution."""

    def post(self, request):
        ser = CostEstimateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        estimate = get_cost_estimate(
            action_id=ser.validated_data["action_id"],
            document_length=ser.validated_data["document_length"],
        )
        return Response(estimate)


class UsageStatsView(APIView):
    """Get AI usage statistics for the current user."""

    def get(self, request):
        now = timezone.now()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        logs = AIUsageLog.objects.filter(
            user=request.user, created_at__gte=month_start, success=True
        )

        # Per-action breakdown
        from django.db.models import Sum, Count

        breakdown = (
            logs.values("action_id")
            .annotate(
                total_calls=Count("id"),
                total_cost=Sum("cost_usd"),
                total_input_tokens=Sum("input_tokens"),
                total_output_tokens=Sum("output_tokens"),
            )
            .order_by("-total_cost")
        )

        total_cost = sum(float(b["total_cost"] or 0) for b in breakdown)
        total_calls = sum(b["total_calls"] for b in breakdown)

        budget = check_budget(request.user)

        return Response(
            {
                "period": {"start": month_start.isoformat(), "end": now.isoformat()},
                "total_cost_usd": round(total_cost, 4),
                "total_cost_sar": round(total_cost * 3.75, 2),
                "total_calls": total_calls,
                "breakdown": list(breakdown),
                "budget": budget,
            }
        )


class BudgetControlView(APIView):
    """Get current budget status."""

    def get(self, request):
        budget = check_budget(request.user)
        return Response(budget)


class AvailableActionsView(APIView):
    """List all available AI actions for the frontend."""

    def get(self, request):
        return Response({"actions": get_available_actions()})


class AnalysisDetailView(APIView):
    """Get details of a specific AI analysis."""

    def get(self, request, analysis_id):
        try:
            analysis = AIAnalysis.objects.get(id=analysis_id)
        except AIAnalysis.DoesNotExist:
            return Response(
                {"error": "التحليل غير موجود"}, status=status.HTTP_404_NOT_FOUND
            )

        return Response(
            {
                "id": str(analysis.id),
                "action_id": analysis.action_id,
                "findings": analysis.findings,
                "missing_provisions": analysis.missing_provisions,
                "risk_score": analysis.risk_score,
                "executive_summary": analysis.executive_summary,
                "status": analysis.status,
                "model_used": analysis.model_used,
                "input_tokens": analysis.input_tokens,
                "output_tokens": analysis.output_tokens,
                "cost_usd": float(analysis.estimated_cost_usd),
                "cost_sar": float(analysis.estimated_cost_usd * 3.75),
                "reviewed_by": str(analysis.reviewed_by_id) if analysis.reviewed_by else None,
                "reviewed_at": analysis.reviewed_at.isoformat() if analysis.reviewed_at else None,
                "review_notes": analysis.review_notes,
                "created_at": analysis.created_at.isoformat(),
            }
        )


class AnalysisReviewView(APIView):
    """Attorney review endpoint — approve or reject AI analysis."""

    def post(self, request, analysis_id):
        try:
            analysis = AIAnalysis.objects.get(id=analysis_id)
        except AIAnalysis.DoesNotExist:
            return Response(
                {"error": "التحليل غير موجود"}, status=status.HTTP_404_NOT_FOUND
            )

        # Only managers/senior lawyers can review
        if not request.user.is_manager:
            return Response(
                {"error": "صلاحية المراجعة متاحة للمحامين الأول فقط"},
                status=status.HTTP_403_FORBIDDEN,
            )

        ser = AnalysisReviewSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        analysis.status = ser.validated_data["status"]
        analysis.reviewed_by = request.user
        analysis.reviewed_at = timezone.now()
        analysis.review_notes = ser.validated_data.get("review_notes", "")
        analysis.save()

        return Response(
            {
                "id": str(analysis.id),
                "status": analysis.status,
                "reviewed_at": analysis.reviewed_at.isoformat(),
            }
        )


class CaseAnalysesView(APIView):
    """List all AI analyses for a specific case."""

    def get(self, request, case_id):
        analyses = AIAnalysis.objects.filter(case_id=case_id).order_by("-created_at")
        return Response(
            {
                "analyses": [
                    {
                        "id": str(a.id),
                        "action_id": a.action_id,
                        "risk_score": a.risk_score,
                        "executive_summary": a.executive_summary,
                        "status": a.status,
                        "model_used": a.model_used,
                        "cost_sar": float(a.estimated_cost_usd * 3.75),
                        "created_at": a.created_at.isoformat(),
                    }
                    for a in analyses
                ]
            }
        )
