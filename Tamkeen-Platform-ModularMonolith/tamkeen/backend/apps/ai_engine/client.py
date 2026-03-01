"""
Claude API Client
=================
Wrapper around the Anthropic Python SDK with:
- Prompt caching for system prompt + Saudi modules
- Token usage logging
- Error handling and retries
"""

import logging
from django.conf import settings

from .parser import parse_json_response
from .saudi_modules.system_prompt import SYSTEM_PROMPT_SAUDI_LEGAL
from .saudi_modules.modules import load_saudi_module
from .optimizer import get_model_id

logger = logging.getLogger(__name__)


def _get_client():
    """Lazy-initialize the Anthropic client."""
    try:
        import anthropic

        api_key = getattr(settings, "ANTHROPIC_API_KEY", None)
        if not api_key:
            raise ValueError("ANTHROPIC_API_KEY not configured in settings")
        return anthropic.Anthropic(api_key=api_key)
    except ImportError:
        raise ImportError("anthropic package not installed. Run: pip install anthropic")


def call_claude(action_template: dict, params: dict, documents_text: str = "") -> dict:
    """
    Execute a Claude API call with the given action template and parameters.

    The system prompt and Saudi legal modules are cached using Claude's
    prompt caching feature (90% discount after first call within 5-min window).

    Returns: {
        "result": dict,           # Parsed JSON response
        "input_tokens": int,
        "output_tokens": int,
        "cache_read_tokens": int,
        "cache_creation_tokens": int,
        "model_used": str,
    }
    """
    client = _get_client()

    # Build the cacheable system messages prefix
    system_messages = [
        {
            "type": "text",
            "text": SYSTEM_PROMPT_SAUDI_LEGAL,
            "cache_control": {"type": "ephemeral"},
        }
    ]

    # Add relevant Saudi law modules (each independently cached)
    for module_key in action_template.get("saudi_modules", []):
        try:
            module_text = load_saudi_module(module_key)
            system_messages.append(
                {
                    "type": "text",
                    "text": module_text,
                    "cache_control": {"type": "ephemeral"},
                }
            )
        except ValueError as e:
            logger.warning("Skipping unknown module: %s", e)

    # Build user message from template (NOT from user input)
    template_params = {**params}
    if documents_text:
        template_params["document_text"] = documents_text

    # Handle optional template sections
    template_params.setdefault("market_benchmark_section", "")
    template_params.setdefault("missing_provisions_section", "")

    if params.get("include_market_benchmark"):
        template_params["market_benchmark_section"] = (
            "- Include: Market benchmark comparison for similar contracts in Saudi market"
        )
    if params.get("include_missing_provisions"):
        template_params["missing_provisions_section"] = (
            "- Include: Check for missing standard provisions required under Saudi law"
        )

    try:
        user_content = action_template["user_template"].format(**template_params)
    except KeyError as e:
        logger.error("Missing template parameter: %s", e)
        return {
            "result": {"error": f"Missing template parameter: {e}"},
            "input_tokens": 0,
            "output_tokens": 0,
            "cache_read_tokens": 0,
            "cache_creation_tokens": 0,
            "model_used": get_model_id(action_template["model_tier"]),
        }

    model_id = get_model_id(action_template["model_tier"])

    try:
        response = client.messages.create(
            model=model_id,
            max_tokens=action_template["max_output_tokens"],
            system=system_messages,
            messages=[{"role": "user", "content": user_content}],
        )

        # Extract token usage
        usage = response.usage
        cache_read = getattr(usage, "cache_read_input_tokens", 0) or 0
        cache_creation = getattr(usage, "cache_creation_input_tokens", 0) or 0

        # Parse the response
        response_text = response.content[0].text if response.content else ""
        parsed_result = parse_json_response(response_text)

        return {
            "result": parsed_result,
            "input_tokens": usage.input_tokens,
            "output_tokens": usage.output_tokens,
            "cache_read_tokens": cache_read,
            "cache_creation_tokens": cache_creation,
            "model_used": model_id,
            "raw_response": response_text,
        }

    except Exception as e:
        logger.error("Claude API call failed: %s", str(e))
        return {
            "result": {"error": f"AI analysis failed: {str(e)}"},
            "input_tokens": 0,
            "output_tokens": 0,
            "cache_read_tokens": 0,
            "cache_creation_tokens": 0,
            "model_used": model_id,
            "raw_response": "",
        }
