"""
Token Optimizer
===============
Handles cost estimation before execution, cache checking,
model tier selection, and document chunking strategies.
"""

import hashlib
import json
from decimal import Decimal
from django.utils import timezone
from datetime import timedelta

from .models import AIAnalysis, AIUsageLog, AIBudget
from .saudi_modules.modules import MODULE_SIZES
from .templates.registry import ACTION_REGISTRY


# Pricing per 1M tokens (Claude API, March 2026)
PRICING = {
    "sonnet": {"input": Decimal("3.00"), "output": Decimal("15.00")},
    "haiku": {"input": Decimal("0.25"), "output": Decimal("1.25")},
}
CACHE_DISCOUNT = Decimal("0.90")  # 90% discount for cached tokens
BATCH_DISCOUNT = Decimal("0.50")  # 50% discount for batch API
USD_TO_SAR = Decimal("3.75")

# Model ID mapping
MODEL_IDS = {
    "sonnet": "claude-sonnet-4-5-20250929",
    "haiku": "claude-haiku-4-5-20251001",
}


def get_model_id(tier: str) -> str:
    """Map tier name to full Claude model ID."""
    return MODEL_IDS.get(tier, MODEL_IDS["sonnet"])


def generate_cache_key(action_id: str, params: dict) -> str:
    """Generate a deterministic SHA256 hash from action + params for cache lookup."""
    # Sort params for deterministic hashing
    canonical = json.dumps({"action": action_id, "params": params}, sort_keys=True)
    return hashlib.sha256(canonical.encode()).hexdigest()


def estimate_doc_tokens(text_length: int, chunk_strategy: str | None = None) -> int:
    """Estimate token count from document character length."""
    # Rough heuristic: ~4 chars per token for mixed Arabic/English
    base_tokens = text_length // 4
    if chunk_strategy == "sections_only":
        return int(base_tokens * 0.4)  # Only relevant sections
    return base_tokens


def estimate_cost(action_id: str, document_length: int, params: dict | None = None) -> dict:
    """
    Estimate the cost of an AI analysis call BEFORE execution.
    Returns cost in both USD and SAR for user display.
    """
    template = ACTION_REGISTRY.get(action_id)
    if not template:
        return {"error": f"Unknown action: {action_id}"}

    tier = template["model_tier"]
    pricing = PRICING[tier]

    # Estimate input tokens
    system_tokens = 2000  # System prompt (cached after first call)
    module_tokens = sum(MODULE_SIZES.get(m, 0) for m in template.get("saudi_modules", []))
    doc_tokens = estimate_doc_tokens(document_length)
    template_tokens = template.get("template_overhead", 300)
    total_input = system_tokens + module_tokens + doc_tokens + template_tokens
    max_output = template["max_output_tokens"]

    # Calculate base cost
    input_cost = Decimal(total_input) * pricing["input"] / Decimal("1000000")
    output_cost = Decimal(max_output) * pricing["output"] / Decimal("1000000")
    base_cost = input_cost + output_cost

    # Apply cache discount for system + module tokens (assume 90% hit after first)
    cacheable_tokens = system_tokens + module_tokens
    cache_savings = (
        Decimal(cacheable_tokens) * CACHE_DISCOUNT * pricing["input"] / Decimal("1000000")
    )
    estimated_cost = base_cost - cache_savings

    return {
        "estimated_cost_usd": float(round(max(estimated_cost, Decimal("0.0001")), 6)),
        "estimated_cost_sar": float(round(max(estimated_cost * USD_TO_SAR, Decimal("0.001")), 4)),
        "input_tokens": total_input,
        "output_tokens": max_output,
        "model": tier,
        "model_id": get_model_id(tier),
        "cache_eligible": True,
        "cacheable_tokens": cacheable_tokens,
    }


def calculate_actual_cost(
    model_tier: str,
    input_tokens: int,
    output_tokens: int,
    cache_read_tokens: int = 0,
    cache_creation_tokens: int = 0,
) -> Decimal:
    """Calculate the actual cost after API call based on real token counts."""
    pricing = PRICING.get(model_tier, PRICING["sonnet"])
    per_million = Decimal("1000000")

    # Non-cached input tokens
    regular_input = input_tokens - cache_read_tokens - cache_creation_tokens
    input_cost = Decimal(regular_input) * pricing["input"] / per_million

    # Cached tokens at 10% of input price
    cache_read_cost = (
        Decimal(cache_read_tokens) * pricing["input"] * (1 - CACHE_DISCOUNT) / per_million
    )

    # Cache creation at full price
    cache_creation_cost = Decimal(cache_creation_tokens) * pricing["input"] / per_million

    # Output tokens
    output_cost = Decimal(output_tokens) * pricing["output"] / per_million

    return input_cost + cache_read_cost + cache_creation_cost + output_cost


def check_cache(action_id: str, params: dict) -> AIAnalysis | None:
    """Check if we have a cached (non-stale) result for this exact action + params."""
    cache_key = generate_cache_key(action_id, params)
    stale_threshold = timezone.now() - timedelta(hours=24)

    cached = (
        AIAnalysis.objects.filter(
            params_hash=cache_key,
            status__in=["completed", "reviewed", "applied"],
            created_at__gte=stale_threshold,
        )
        .order_by("-created_at")
        .first()
    )
    return cached


def check_budget(user, action_id: str = None) -> dict:
    """Check if user has remaining AI budget for this month."""
    now = timezone.now()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # Get user's monthly usage
    monthly_usage = AIUsageLog.objects.filter(
        user=user, created_at__gte=month_start, success=True
    )
    monthly_cost = sum(log.cost_usd for log in monthly_usage)
    monthly_calls = monthly_usage.count()

    # Check user-level budget
    user_budget = AIBudget.objects.filter(scope="user", user=user, is_active=True).first()
    firm_budget = AIBudget.objects.filter(scope="firm", is_active=True).first()

    # Use user budget if exists, otherwise firm budget, otherwise default
    budget = user_budget or firm_budget
    limit_usd = budget.monthly_limit_usd if budget else Decimal("50.00")
    limit_calls = budget.monthly_limit_calls if budget else 1000
    alert_threshold = budget.alert_threshold_percent if budget else 80

    # Check per-action limits
    action_limit = None
    if budget and action_id and budget.action_limits:
        action_limit = budget.action_limits.get(action_id)
        if action_limit:
            action_count = monthly_usage.filter(action_id=action_id).count()
            if action_count >= action_limit:
                return {
                    "allowed": False,
                    "reason": f"تم تجاوز الحد الشهري لعملية {action_id}",
                    "monthly_cost_usd": float(monthly_cost),
                    "monthly_calls": monthly_calls,
                }

    exceeded = monthly_cost >= limit_usd or monthly_calls >= limit_calls
    usage_percent = float(monthly_cost / limit_usd * 100) if limit_usd > 0 else 0
    at_alert = usage_percent >= alert_threshold

    return {
        "allowed": not exceeded,
        "at_alert_threshold": at_alert,
        "reason": "تم تجاوز الميزانية الشهرية" if exceeded else None,
        "monthly_cost_usd": float(monthly_cost),
        "monthly_cost_sar": float(monthly_cost * USD_TO_SAR),
        "monthly_calls": monthly_calls,
        "limit_usd": float(limit_usd),
        "limit_calls": limit_calls,
        "usage_percent": round(usage_percent, 1),
    }
