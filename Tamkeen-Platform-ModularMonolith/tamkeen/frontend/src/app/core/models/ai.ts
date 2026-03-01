// تمكين — AI Engine Models

/** Available AI actions */
export type AIActionId =
  | 'contract_review'
  | 'counter_analysis'
  | 'demand_response'
  | 'risk_assessment'
  | 'provision_check'
  | 'clause_generate'
  | 'compliance_check'
  | 'summary_generate';

export type AIModelTier = 'sonnet' | 'haiku';
export type Severity = 'critical' | 'high' | 'medium' | 'low';
export type RiskType = 'liability_shift' | 'missing_protection' | 'saudi_non_compliance' | 'ambiguity';
export type AnalysisStatus = 'pending' | 'completed' | 'reviewed' | 'rejected' | 'applied';

export interface AIAction {
  action_id: AIActionId;
  name_ar: string;
  model_tier: AIModelTier;
}

/** Cost estimate returned before execution */
export interface CostEstimate {
  estimated_cost_usd: number;
  estimated_cost_sar: number;
  input_tokens: number;
  output_tokens: number;
  model: AIModelTier;
  model_id: string;
  cache_eligible: boolean;
}

/** Single finding from contract review or compliance check */
export interface AIFinding {
  section: string;
  provision_text: string;
  severity: Severity;
  risk_type: RiskType;
  analysis_ar: string;
  recommendation_ar: string;
  counter_language_ar: string;
  saudi_law_reference: string | null;
}

/** Missing provision entry */
export interface MissingProvision {
  provision: string;
  importance: 'required' | 'recommended';
  reason_ar: string;
  suggested_language_ar?: string;
  saudi_law_reference?: string | null;
}

/** Risk category from risk assessment */
export interface RiskCategory {
  category: string;
  risk_level: Severity;
  description_ar: string;
  impact_ar: string;
  mitigation_ar: string;
}

/** Full AI analysis result from API */
export interface AIAnalysisResult {
  success: boolean;
  cached: boolean;
  analysis_id: string;
  findings: AIFinding[] | RiskCategory[];
  missing_provisions: MissingProvision[];
  risk_score: number | null;
  executive_summary: string;
  status: AnalysisStatus;
  model_used: string;
  cost_usd: number;
  cost_sar?: number;
  tokens?: {
    input: number;
    output: number;
    cache_read: number;
    cache_creation: number;
  };
  budget_warning?: boolean;
  error?: string;
}

/** Stored analysis record */
export interface AIAnalysis {
  id: string;
  action_id: AIActionId;
  risk_score: number | null;
  executive_summary: string;
  status: AnalysisStatus;
  model_used: string;
  cost_sar: number;
  created_at: string;
}

/** Budget status */
export interface AIBudget {
  allowed: boolean;
  at_alert_threshold: boolean;
  reason: string | null;
  monthly_cost_usd: number;
  monthly_cost_sar: number;
  monthly_calls: number;
  limit_usd: number;
  limit_calls: number;
  usage_percent: number;
}

/** Usage statistics */
export interface AIUsageStats {
  period: { start: string; end: string };
  total_cost_usd: number;
  total_cost_sar: number;
  total_calls: number;
  breakdown: {
    action_id: string;
    total_calls: number;
    total_cost: number;
    total_input_tokens: number;
    total_output_tokens: number;
  }[];
  budget: AIBudget;
}

/** Contract review request params */
export interface ContractReviewParams {
  case_id: string;
  document_id: string;
  party_role: 'client' | 'counterparty';
  review_mode: 'full' | 'risk_only' | 'compliance';
  severity_filter: 'all' | 'high_critical';
  include_market_benchmark: boolean;
  include_missing_provisions: boolean;
}

/** Risk assessment request params */
export interface RiskAssessmentParams {
  case_id?: string;
  document_id: string;
  party_role: 'client' | 'counterparty';
  risk_categories: 'all' | 'financial' | 'legal' | 'compliance' | 'operational';
}

/** Summary generation request params */
export interface SummaryGenerateParams {
  document_id: string;
  summary_type: 'brief' | 'detailed' | 'key_terms' | 'obligations';
  language: 'ar' | 'en' | 'both';
}
