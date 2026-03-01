"""
AI Engine URL Configuration
===========================
Action-based endpoints — POST for analysis, GET for stats/details.
"""

from django.urls import path
from .views import (
    ContractReviewView,
    CounterAnalysisView,
    DemandResponseView,
    RiskAssessmentView,
    ProvisionCheckView,
    ClauseGenerateView,
    ComplianceCheckView,
    SummaryGenerateView,
    CostEstimateView,
    UsageStatsView,
    BudgetControlView,
    AvailableActionsView,
    AnalysisDetailView,
    AnalysisReviewView,
    CaseAnalysesView,
)

urlpatterns = [
    # ─── Analysis Actions (POST only, no free text) ───
    path("analyze/contract/", ContractReviewView.as_view(), name="ai-contract-review"),
    path("analyze/counter-position/", CounterAnalysisView.as_view(), name="ai-counter-analysis"),
    path("analyze/demand-letter/", DemandResponseView.as_view(), name="ai-demand-response"),
    path("analyze/risk/", RiskAssessmentView.as_view(), name="ai-risk-assessment"),
    path("analyze/provisions/", ProvisionCheckView.as_view(), name="ai-provision-check"),
    path("analyze/compliance/", ComplianceCheckView.as_view(), name="ai-compliance-check"),
    # ─── Generation Actions ───
    path("generate/clause/", ClauseGenerateView.as_view(), name="ai-clause-generate"),
    path("generate/summary/", SummaryGenerateView.as_view(), name="ai-summary-generate"),
    # ─── Utilities ───
    path("estimate-cost/", CostEstimateView.as_view(), name="ai-cost-estimate"),
    path("actions/", AvailableActionsView.as_view(), name="ai-available-actions"),
    # ─── Usage & Budget ───
    path("usage/stats/", UsageStatsView.as_view(), name="ai-usage-stats"),
    path("usage/budget/", BudgetControlView.as_view(), name="ai-budget"),
    # ─── Analysis Management ───
    path("analysis/<uuid:analysis_id>/", AnalysisDetailView.as_view(), name="ai-analysis-detail"),
    path(
        "analysis/<uuid:analysis_id>/review/",
        AnalysisReviewView.as_view(),
        name="ai-analysis-review",
    ),
    path("case/<uuid:case_id>/analyses/", CaseAnalysesView.as_view(), name="ai-case-analyses"),
]
