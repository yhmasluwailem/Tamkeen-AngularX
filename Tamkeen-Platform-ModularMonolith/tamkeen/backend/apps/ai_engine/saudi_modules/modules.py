"""
Saudi Legal Knowledge Modules
==============================
Each module contains domain-specific Saudi legal knowledge
loaded only when the relevant action requires it.
Token sizes are approximate and used for cost estimation.
"""

MODULES = {
    "companies_law": {
        "name": "نظام الشركات",
        "estimated_tokens": 800,
        "content": """
# Saudi Companies Law (Royal Decree M/132, 2022)
## Key Provisions for Contract Analysis
- Art. 2: Company types — LLC (ذ.م.م), JSC (شركة مساهمة), simplified JSC, partnership
- Art. 16: Founder obligations and minimum capital requirements
- Art. 50-73: LLC governance — manager appointment, partner meetings, profit distribution
- Art. 108: Director liability — personal liability for negligence, fraud, or ultra vires acts
- Art. 166: Shareholder agreements must not contradict mandatory provisions
- Art. 209: Merger and acquisition procedures, creditor protection period (30 days)
- Art. 227: Dissolution grounds — court order, partner agreement, or expiry of term

## Mandatory Rules (Cannot be Contractually Waived)
- Minimum formation requirements per company type
- Creditor protection periods
- Director fiduciary duties
- Minority shareholder rights (10% threshold for audit requests)
- Financial reporting obligations (SOCPA standards)

## Common Contract Issues
- Non-compete clauses: Valid if reasonable in scope, duration (max 2 years), and geography
- Indemnification: Cannot indemnify against willful misconduct or gross negligence
- Governing law: Saudi law mandatory for Saudi-incorporated entities
""",
    },
    "labor_law": {
        "name": "نظام العمل",
        "estimated_tokens": 600,
        "content": """
# Saudi Labor Law (Royal Decree M/51, as amended)
## Key Employment Provisions
- Art. 37: Written contract required in Arabic (Arabic prevails in disputes)
- Art. 50-53: Probation period — max 90 days, extendable to 180 by agreement
- Art. 74-81: Termination provisions — notice period (60 days monthly/30 days otherwise)
- Art. 77: Compensation for unfair termination (15 days per year for indefinite contracts)
- Art. 84: End-of-service award — 1/2 month for first 5 years, 1 month per year thereafter
- Art. 113-122: Annual leave (21 days, increasing to 30 after 5 years)
- Art. 128-130: Non-compete — max 2 years, must protect legitimate interests

## GOSI Integration
- Employer contribution: 12% (9.75% pension, 2% SANED, 0.25% occupational hazard)
- Employee contribution: 10.75% (9.75% pension, 1% SANED)
- Registration mandatory within 15 days of employment start

## Saudization (Nitaqat)
- Industry-specific quotas for Saudi nationals
- Penalties for non-compliance: work visa restrictions, fines

## Common Contract Issues
- Fixed vs indefinite term contracts (different termination rules)
- Garden leave clauses enforceability
- IP assignment provisions in employment context
""",
    },
    "commercial_law": {
        "name": "النظام التجاري",
        "estimated_tokens": 700,
        "content": """
# Saudi Commercial Court Law & Commercial Practice
## Contract Enforcement
- Contracts valid if: offer, acceptance, lawful purpose, competent parties
- Arabic language governs interpretation in Saudi courts
- Force majeure: Recognized but narrowly construed
- Limitation periods: 5 years for commercial claims, 10 years for civil

## Commercial Agency
- Commercial Agency Law (Royal Decree M/11)
- Exclusive agency agreements: Agent entitled to commission on all territory sales
- Termination of agency: Compensation required for unjust termination
- Registration with MoC mandatory for enforceability

## Arbitration
- Saudi Arbitration Law (Royal Decree M/34, 2012)
- SCCA institutional rules
- Arbitration agreement must be in writing
- Sharia compliance required for enforcement
- Court enforcement via Execution Judge

## Commercial Fraud & Paper
- Negotiable instruments under Commercial Papers Law
- Check bounce: Criminal liability (Penal Code Art. 374)
- Letter of credit governed by UCP 600 + Saudi commercial practice

## Common Contract Issues
- Penalty clauses: Enforceable but court may adjust if excessive
- Assignment clauses: Require counterparty consent unless contract permits
- Waiver provisions: Must be explicit, no implied waiver
""",
    },
    "real_estate": {
        "name": "العقارات",
        "estimated_tokens": 500,
        "content": """
# Saudi Real Estate Regulations
## Ownership System
- REGA (Real Estate General Authority) oversight
- Registered ownership (صك ملكية) through Notary Public
- Non-Saudi ownership: Restricted, requires MISA license for commercial
- Foreign ownership in Mecca/Medina: Prohibited (with limited exceptions)

## Lease Regulations
- Ejar platform mandatory registration for all residential leases
- Commercial leases: Freedom of contract, subject to mandatory provisions
- Rent increase: Governed by market and contract terms
- Eviction: Court order required, 15-day notice for non-payment

## Real Estate Development
- Off-plan sales: Regulated by RERA (Real Estate Developer Authority)
- Escrow requirements for off-plan projects
- Developer licensing requirements

## Common Contract Issues
- Title verification requirements before transaction
- Municipality approvals and zoning compliance
- Building code compliance obligations
""",
    },
    "investment_vc": {
        "name": "الاستثمار ورأس المال الجريء",
        "estimated_tokens": 900,
        "content": """
# Saudi Investment & Venture Capital Framework
## Foreign Investment
- Foreign Investment Law (Royal Decree M/1, 2000)
- MISA (Ministry of Investment) licensing requirements
- Negative list: Activities restricted for foreign investors
- Minimum capital requirements vary by sector
- Tax: 20% corporate tax for foreign-owned entities (15% for mixed)

## VC & Startup Structures
- Simplified Joint Stock Company (SJSC): Preferred for startups
- Convertible notes: Recognized, but structure carefully for Sharia compliance
- SAFE agreements: Adapt to Saudi legal framework
- Vesting schedules: Enforceable via shareholder agreements

## CMA Regulations
- Capital Market Authority oversight for securities
- Crowdfunding regulations (FinTech Sandbox)
- Exempt offer provisions for private placements
- Prospectus requirements for public offerings

## Key Regulatory Bodies
- MISA: Investment licensing
- CMA: Securities regulation
- SAMA: Banking and insurance
- ZATCA: Tax compliance (VAT 15%, withholding tax)

## Common Contract Issues
- Shareholder agreement enforceability under Companies Law
- Tag-along / drag-along provisions
- Anti-dilution protection mechanisms
- Board composition and reserved matters
""",
    },
    "enforcement": {
        "name": "التنفيذ",
        "estimated_tokens": 400,
        "content": """
# Saudi Execution (Enforcement) Law
## Judgment Enforcement
- Execution Law (Royal Decree M/53, 2012)
- Execution Judge at General Court
- Enforcement application within 5 days of judgment becoming final
- Debtor notification: 5 days to comply voluntarily

## Asset Seizure
- Bank account freezing via SAMA integration
- Real estate attachment via Notary Public
- Vehicle and equipment seizure
- Travel ban for debtors (discretionary)

## Enforcement Procedures
- Salary garnishment: Max 1/3 of monthly salary
- Property auction: Public auction with minimum bid requirements
- Installment plans: Court may approve for hardship cases

## Foreign Judgment Enforcement
- Reciprocity principle with treaty countries
- GCC Enforcement Convention for GCC judgments
- Arbitral award enforcement under New York Convention

## Common Issues
- Enforcement timeline: 20-90 days typical
- Stay of execution: Appeal does not automatically stay
- Enforcement cost recovery from debtor
""",
    },
}

# Module sizes for cost estimation
MODULE_SIZES = {key: mod["estimated_tokens"] for key, mod in MODULES.items()}


def load_saudi_module(module_key: str) -> str:
    """Load a specific Saudi legal knowledge module."""
    module = MODULES.get(module_key)
    if not module:
        raise ValueError(f"Unknown Saudi legal module: {module_key}")
    return module["content"]


def get_modules_for_court_type(court_type: str) -> list[str]:
    """Return relevant module keys based on case court type."""
    mapping = {
        "commercial": ["commercial_law", "companies_law"],
        "labor": ["labor_law"],
        "general": ["commercial_law"],
        "criminal": ["enforcement"],
        "personal_status": [],
        "execution": ["enforcement"],
    }
    return mapping.get(court_type, ["commercial_law"])
