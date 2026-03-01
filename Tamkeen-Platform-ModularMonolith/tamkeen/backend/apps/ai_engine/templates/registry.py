"""
AI Action Registry & Prompt Templates
======================================
Each user action maps to a pre-built prompt template.
Users select parameters through the UI, never write text.
"""

ACTION_REGISTRY = {
    "contract_review": {
        "action_id": "contract_review",
        "name_ar": "مراجعة العقد",
        "model_tier": "sonnet",
        "max_output_tokens": 2000,
        "cacheable_prefix": True,
        "template_overhead": 500,
        "saudi_modules": ["commercial_law"],
        "user_template": """
Analyze this {contract_type} from the perspective of {party_role}.

## Document Content
{document_text}

## Analysis Parameters
- Perspective: {party_role}
- Review mode: {review_mode}
- Court type: {court_type}
- Severity threshold: {severity_filter}
{market_benchmark_section}
{missing_provisions_section}

## Required Output (JSON)
{{
  "findings": [
    {{
      "section": "string",
      "provision_text": "string (max 100 chars)",
      "severity": "critical|high|medium|low",
      "risk_type": "liability_shift|missing_protection|saudi_non_compliance|ambiguity",
      "analysis_ar": "string",
      "recommendation_ar": "string",
      "counter_language_ar": "string",
      "saudi_law_reference": "string or null"
    }}
  ],
  "missing_provisions": [
    {{ "provision": "string", "importance": "required|recommended", "reason_ar": "string" }}
  ],
  "overall_risk_score": 1-10,
  "executive_summary_ar": "string (max 200 words)"
}}
""",
    },
    "counter_analysis": {
        "action_id": "counter_analysis",
        "name_ar": "تحليل الموقف المقابل",
        "model_tier": "sonnet",
        "max_output_tokens": 3000,
        "cacheable_prefix": True,
        "template_overhead": 600,
        "saudi_modules": ["commercial_law"],
        "user_template": """
Analyze the counter-position arguments in this {dispute_type} dispute.

## Our Position Documents
{our_documents}

## Counter-Party Position Documents
{counter_documents}

## Analysis Parameters
- Our role: {party_role}
- Court type: {court_type}
- Focus area: {focus_area}

## Required Output (JSON)
{{
  "counter_arguments": [
    {{
      "argument": "string",
      "strength": "strong|moderate|weak",
      "our_vulnerability": "string",
      "recommended_response_ar": "string",
      "supporting_law": "string or null"
    }}
  ],
  "strategic_assessment": {{
    "overall_position_strength": 1-10,
    "key_risks": ["string"],
    "recommended_strategy_ar": "string"
  }},
  "executive_summary_ar": "string (max 200 words)"
}}
""",
    },
    "demand_response": {
        "action_id": "demand_response",
        "name_ar": "تحليل خطاب المطالبة",
        "model_tier": "sonnet",
        "max_output_tokens": 3500,
        "cacheable_prefix": True,
        "template_overhead": 700,
        "saudi_modules": ["commercial_law", "enforcement"],
        "user_template": """
Analyze this demand letter and prepare a response strategy.

## Demand Letter Content
{document_text}

## Case Context
- Our client role: {party_role}
- Case type: {case_type}
- Court jurisdiction: {court_type}
- Response deadline: {deadline}

## Required Output (JSON)
{{
  "demand_analysis": {{
    "claimed_amount": "string or null",
    "legal_basis_claimed": "string",
    "validity_assessment": "valid|partially_valid|invalid",
    "legal_basis_analysis_ar": "string"
  }},
  "vulnerabilities": [
    {{
      "point": "string",
      "severity": "critical|high|medium|low",
      "mitigation_ar": "string"
    }}
  ],
  "response_strategy": {{
    "recommended_approach": "negotiate|contest|partial_accept",
    "key_arguments_ar": ["string"],
    "proposed_counter_amount": "string or null",
    "timeline_recommendation_ar": "string"
  }},
  "executive_summary_ar": "string (max 200 words)"
}}
""",
    },
    "risk_assessment": {
        "action_id": "risk_assessment",
        "name_ar": "تقييم المخاطر",
        "model_tier": "haiku",
        "max_output_tokens": 1500,
        "cacheable_prefix": True,
        "template_overhead": 400,
        "saudi_modules": ["commercial_law"],
        "user_template": """
Perform a risk assessment on this legal document.

## Document Content
{document_text}

## Assessment Parameters
- Client perspective: {party_role}
- Risk categories to evaluate: {risk_categories}
- Court type: {court_type}

## Required Output (JSON)
{{
  "risk_categories": [
    {{
      "category": "string",
      "risk_level": "critical|high|medium|low",
      "description_ar": "string",
      "impact_ar": "string",
      "mitigation_ar": "string"
    }}
  ],
  "overall_risk_score": 1-10,
  "risk_summary_ar": "string (max 100 words)"
}}
""",
    },
    "provision_check": {
        "action_id": "provision_check",
        "name_ar": "فحص البنود المفقودة",
        "model_tier": "haiku",
        "max_output_tokens": 1000,
        "cacheable_prefix": True,
        "template_overhead": 350,
        "saudi_modules": ["commercial_law"],
        "user_template": """
Check this {contract_type} for missing standard provisions under Saudi law.

## Document Content
{document_text}

## Parameters
- Contract type: {contract_type}
- Court type: {court_type}

## Required Output (JSON)
{{
  "missing_provisions": [
    {{
      "provision": "string",
      "importance": "required|recommended",
      "reason_ar": "string",
      "suggested_language_ar": "string",
      "saudi_law_reference": "string or null"
    }}
  ],
  "completeness_score": 1-10,
  "summary_ar": "string (max 100 words)"
}}
""",
    },
    "clause_generate": {
        "action_id": "clause_generate",
        "name_ar": "توليد صياغة بديلة",
        "model_tier": "haiku",
        "max_output_tokens": 800,
        "cacheable_prefix": True,
        "template_overhead": 300,
        "saudi_modules": ["commercial_law"],
        "user_template": """
Generate alternative contract language for the specified clause.

## Original Clause
{clause_text}

## Parameters
- Objective: {objective}
- Favoring party: {party_role}
- Clause type: {clause_type}

## Required Output (JSON)
{{
  "alternatives": [
    {{
      "version": "balanced|client_favorable|aggressive",
      "language_ar": "string",
      "rationale_ar": "string",
      "saudi_law_reference": "string or null"
    }}
  ]
}}
""",
    },
    "compliance_check": {
        "action_id": "compliance_check",
        "name_ar": "فحص الامتثال السعودي",
        "model_tier": "sonnet",
        "max_output_tokens": 2000,
        "cacheable_prefix": True,
        "template_overhead": 500,
        "saudi_modules": ["commercial_law", "companies_law"],
        "user_template": """
Check this document for compliance with Saudi Arabian law and regulations.

## Document Content
{document_text}

## Parameters
- Document type: {document_type}
- Industry sector: {industry_sector}
- Regulatory focus: {regulatory_focus}

## Required Output (JSON)
{{
  "compliance_issues": [
    {{
      "regulation": "string",
      "article": "string",
      "issue_description_ar": "string",
      "severity": "critical|high|medium|low",
      "recommendation_ar": "string",
      "deadline": "string or null"
    }}
  ],
  "compliant_areas": ["string"],
  "compliance_score": 1-100,
  "summary_ar": "string (max 200 words)"
}}
""",
    },
    "summary_generate": {
        "action_id": "summary_generate",
        "name_ar": "إنشاء ملخص",
        "model_tier": "haiku",
        "max_output_tokens": 800,
        "cacheable_prefix": True,
        "template_overhead": 200,
        "saudi_modules": [],
        "user_template": """
Generate a structured legal summary of this document.

## Document Content
{document_text}

## Parameters
- Summary type: {summary_type}
- Language: {language}

## Required Output (JSON)
{{
  "title_ar": "string",
  "parties": ["string"],
  "document_type": "string",
  "key_terms": [
    {{ "term": "string", "value_ar": "string" }}
  ],
  "critical_dates": [
    {{ "date": "string", "event_ar": "string" }}
  ],
  "summary_ar": "string (max 300 words)",
  "key_obligations": [
    {{ "party": "string", "obligation_ar": "string" }}
  ]
}}
""",
    },
}


def get_template(action_id: str) -> dict:
    """Get a prompt template by action ID."""
    template = ACTION_REGISTRY.get(action_id)
    if not template:
        raise ValueError(f"Unknown action: {action_id}")
    return template


def get_available_actions() -> list[dict]:
    """Return list of available actions for the frontend."""
    return [
        {
            "action_id": t["action_id"],
            "name_ar": t["name_ar"],
            "model_tier": t["model_tier"],
        }
        for t in ACTION_REGISTRY.values()
    ]
