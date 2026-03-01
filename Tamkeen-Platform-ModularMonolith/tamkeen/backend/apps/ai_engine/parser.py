"""
Response Parser
===============
Extracts and validates structured JSON from Claude API responses.
Handles edge cases like markdown code blocks, partial JSON, etc.
"""

import json
import re
import logging

logger = logging.getLogger(__name__)


def parse_json_response(response_text: str) -> dict:
    """
    Parse Claude's response text into a Python dict.
    Handles cases where JSON may be wrapped in markdown code blocks.
    """
    if not response_text:
        return {"error": "Empty response from AI", "raw": ""}

    text = response_text.strip()

    # Try direct parse first
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Strip markdown code blocks
    patterns = [
        r"```json\s*(.*?)\s*```",
        r"```\s*(.*?)\s*```",
        r"\{.*\}",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1) if "```" in pattern else match.group(0))
            except json.JSONDecodeError:
                continue

    logger.warning("Failed to parse AI response as JSON: %s...", text[:200])
    return {
        "error": "Failed to parse AI response",
        "raw": text[:2000],
    }


def validate_findings(data: dict) -> dict:
    """Validate and normalize the findings structure from a contract_review response."""
    findings = data.get("findings", [])
    valid_severities = {"critical", "high", "medium", "low"}
    valid_risk_types = {
        "liability_shift",
        "missing_protection",
        "saudi_non_compliance",
        "ambiguity",
    }

    validated = []
    for f in findings:
        if not isinstance(f, dict):
            continue
        severity = f.get("severity", "medium")
        if severity not in valid_severities:
            severity = "medium"
        risk_type = f.get("risk_type", "ambiguity")
        if risk_type not in valid_risk_types:
            risk_type = "ambiguity"

        validated.append(
            {
                "section": str(f.get("section", "")),
                "provision_text": str(f.get("provision_text", ""))[:100],
                "severity": severity,
                "risk_type": risk_type,
                "analysis_ar": str(f.get("analysis_ar", "")),
                "recommendation_ar": str(f.get("recommendation_ar", "")),
                "counter_language_ar": str(f.get("counter_language_ar", "")),
                "saudi_law_reference": f.get("saudi_law_reference"),
            }
        )

    missing = data.get("missing_provisions", [])
    validated_missing = []
    for m in missing:
        if not isinstance(m, dict):
            continue
        importance = m.get("importance", "recommended")
        if importance not in ("required", "recommended"):
            importance = "recommended"
        validated_missing.append(
            {
                "provision": str(m.get("provision", "")),
                "importance": importance,
                "reason_ar": str(m.get("reason_ar", "")),
            }
        )

    risk_score = data.get("overall_risk_score")
    if isinstance(risk_score, (int, float)):
        risk_score = max(1, min(10, int(risk_score)))
    else:
        risk_score = None

    return {
        "findings": validated,
        "missing_provisions": validated_missing,
        "overall_risk_score": risk_score,
        "executive_summary_ar": str(data.get("executive_summary_ar", ""))[:2000],
    }


def validate_risk_assessment(data: dict) -> dict:
    """Validate risk assessment response."""
    categories = data.get("risk_categories", [])
    validated = []
    for c in categories:
        if not isinstance(c, dict):
            continue
        validated.append(
            {
                "category": str(c.get("category", "")),
                "risk_level": c.get("risk_level", "medium"),
                "description_ar": str(c.get("description_ar", "")),
                "impact_ar": str(c.get("impact_ar", "")),
                "mitigation_ar": str(c.get("mitigation_ar", "")),
            }
        )

    return {
        "risk_categories": validated,
        "overall_risk_score": data.get("overall_risk_score"),
        "risk_summary_ar": str(data.get("risk_summary_ar", ""))[:1000],
    }


# Validator dispatch table
VALIDATORS = {
    "contract_review": validate_findings,
    "compliance_check": validate_findings,
    "risk_assessment": validate_risk_assessment,
}


def validate_response(action_id: str, data: dict) -> dict:
    """Run action-specific validation on parsed response."""
    validator = VALIDATORS.get(action_id)
    if validator:
        return validator(data)
    return data  # Return as-is for actions without specific validators
