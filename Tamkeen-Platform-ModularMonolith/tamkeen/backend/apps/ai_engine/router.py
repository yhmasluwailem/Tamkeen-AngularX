"""
AI Router
=========
Central orchestrator for AI analysis requests.
Validates → checks cache → checks budget → calls Claude → stores results.
"""

import logging
from django.utils import timezone

from .models import AIAnalysis, AIUsageLog
from .client import call_claude
from .optimizer import (
    check_cache,
    check_budget,
    generate_cache_key,
    calculate_actual_cost,
    estimate_cost,
)
from .parser import validate_response
from .templates.registry import get_template

logger = logging.getLogger(__name__)


def execute(
    action_id: str,
    params: dict,
    user,
    case=None,
    document=None,
    document_text: str = "",
) -> dict:
    """
    Execute an AI analysis action.

    Flow:
    1. Get template
    2. Check DB cache for identical previous analysis
    3. Check user/firm budget
    4. Call Claude API
    5. Parse + validate response
    6. Store result in DB
    7. Log usage
    8. Return structured result
    """
    # 1. Get template
    try:
        template = get_template(action_id)
    except ValueError as e:
        return {"success": False, "error": str(e)}

    # 2. Check cache
    cache_params = {**params}
    if document_text:
        cache_params["_doc_hash"] = hash(document_text)

    cached = check_cache(action_id, cache_params)
    if cached:
        logger.info("Cache hit for %s (analysis %s)", action_id, cached.id)
        return {
            "success": True,
            "cached": True,
            "analysis_id": str(cached.id),
            "findings": cached.findings,
            "missing_provisions": cached.missing_provisions,
            "risk_score": cached.risk_score,
            "executive_summary": cached.executive_summary,
            "status": cached.status,
            "model_used": cached.model_used,
            "cost_usd": float(cached.estimated_cost_usd),
        }

    # 3. Check budget
    budget_check = check_budget(user, action_id)
    if not budget_check["allowed"]:
        return {
            "success": False,
            "error": budget_check["reason"],
            "budget": budget_check,
        }

    # 4. Call Claude API
    api_result = call_claude(template, params, document_text)

    if "error" in api_result["result"]:
        # Log failed attempt
        AIUsageLog.objects.create(
            user=user,
            action_id=action_id,
            model_used=api_result["model_used"],
            input_tokens=api_result["input_tokens"],
            output_tokens=api_result["output_tokens"],
            cache_read_tokens=api_result["cache_read_tokens"],
            cache_creation_tokens=api_result["cache_creation_tokens"],
            cost_usd=0,
            success=False,
            error_message=api_result["result"]["error"],
        )
        return {
            "success": False,
            "error": api_result["result"]["error"],
        }

    # 5. Validate response
    validated = validate_response(action_id, api_result["result"])

    # 6. Calculate actual cost
    actual_cost = calculate_actual_cost(
        model_tier=template["model_tier"],
        input_tokens=api_result["input_tokens"],
        output_tokens=api_result["output_tokens"],
        cache_read_tokens=api_result["cache_read_tokens"],
        cache_creation_tokens=api_result["cache_creation_tokens"],
    )

    # 7. Store result
    analysis = AIAnalysis.objects.create(
        case=case,
        document=document,
        action_id=action_id,
        params_hash=generate_cache_key(action_id, cache_params),
        findings=validated.get("findings", validated.get("risk_categories", [])),
        missing_provisions=validated.get("missing_provisions", []),
        risk_score=validated.get("overall_risk_score"),
        executive_summary=validated.get(
            "executive_summary_ar",
            validated.get("risk_summary_ar", validated.get("summary_ar", "")),
        ),
        raw_response={
            "parsed": api_result["result"],
            "raw_text": api_result.get("raw_response", ""),
        },
        model_used=api_result["model_used"],
        input_tokens=api_result["input_tokens"],
        output_tokens=api_result["output_tokens"],
        cache_read_tokens=api_result["cache_read_tokens"],
        cache_creation_tokens=api_result["cache_creation_tokens"],
        estimated_cost_usd=actual_cost,
        status="completed",
        created_by=user,
    )

    # 8. Log usage
    AIUsageLog.objects.create(
        user=user,
        action_id=action_id,
        model_used=api_result["model_used"],
        input_tokens=api_result["input_tokens"],
        output_tokens=api_result["output_tokens"],
        cache_read_tokens=api_result["cache_read_tokens"],
        cache_creation_tokens=api_result["cache_creation_tokens"],
        cost_usd=actual_cost,
        success=True,
    )

    logger.info(
        "AI analysis %s completed: action=%s, cost=$%.6f, tokens=%d/%d",
        analysis.id,
        action_id,
        actual_cost,
        api_result["input_tokens"],
        api_result["output_tokens"],
    )

    return {
        "success": True,
        "cached": False,
        "analysis_id": str(analysis.id),
        "findings": analysis.findings,
        "missing_provisions": analysis.missing_provisions,
        "risk_score": analysis.risk_score,
        "executive_summary": analysis.executive_summary,
        "status": analysis.status,
        "model_used": analysis.model_used,
        "cost_usd": float(actual_cost),
        "cost_sar": float(actual_cost * 3.75),
        "tokens": {
            "input": api_result["input_tokens"],
            "output": api_result["output_tokens"],
            "cache_read": api_result["cache_read_tokens"],
            "cache_creation": api_result["cache_creation_tokens"],
        },
        "budget_warning": budget_check.get("at_alert_threshold", False),
    }


def get_cost_estimate(action_id: str, document_length: int, params: dict = None) -> dict:
    """Public wrapper for cost estimation."""
    return estimate_cost(action_id, document_length, params)
