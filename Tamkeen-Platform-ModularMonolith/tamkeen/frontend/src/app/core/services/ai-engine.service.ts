import { Injectable, signal, computed } from '@angular/core';
import {
  AIAnalysisResult, AIAnalysis, AIBudget, AIUsageStats,
  CostEstimate, AIAction, AIActionId,
  ContractReviewParams, RiskAssessmentParams, SummaryGenerateParams,
  Severity
} from '../models/ai';

@Injectable({ providedIn: 'root' })
export class AIEngineService {

  private readonly API_BASE = '/api/v1/ai';

  private _loading = signal(false);
  private _lastResult = signal<AIAnalysisResult | null>(null);
  private _analyses = signal<AIAnalysis[]>([]);
  private _budget = signal<AIBudget>({
    allowed: true, at_alert_threshold: false, reason: null,
    monthly_cost_usd: 2.35, monthly_cost_sar: 8.81, monthly_calls: 47,
    limit_usd: 50, limit_calls: 1000, usage_percent: 4.7,
  });

  loading = this._loading.asReadonly();
  lastResult = this._lastResult.asReadonly();
  analyses = this._analyses.asReadonly();
  budget = this._budget.asReadonly();
  budgetUsagePercent = computed(() => this._budget().usage_percent);

  readonly availableActions: AIAction[] = [
    { action_id: 'contract_review', name_ar: 'مراجعة العقد', model_tier: 'sonnet' },
    { action_id: 'counter_analysis', name_ar: 'تحليل الموقف المقابل', model_tier: 'sonnet' },
    { action_id: 'demand_response', name_ar: 'تحليل خطاب المطالبة', model_tier: 'sonnet' },
    { action_id: 'risk_assessment', name_ar: 'تقييم المخاطر', model_tier: 'haiku' },
    { action_id: 'provision_check', name_ar: 'فحص البنود المفقودة', model_tier: 'haiku' },
    { action_id: 'clause_generate', name_ar: 'توليد صياغة بديلة', model_tier: 'haiku' },
    { action_id: 'compliance_check', name_ar: 'فحص الامتثال السعودي', model_tier: 'sonnet' },
    { action_id: 'summary_generate', name_ar: 'إنشاء ملخص', model_tier: 'haiku' },
  ];

  estimateCost(actionId: AIActionId, documentLength: number): CostEstimate {
    const tiers: Record<string, { input: number; output: number }> = {
      sonnet: { input: 3.0, output: 15.0 }, haiku: { input: 0.25, output: 1.25 },
    };
    const templates: Record<string, { tier: string; maxOutput: number; modules: number }> = {
      contract_review: { tier: 'sonnet', maxOutput: 2000, modules: 700 },
      counter_analysis: { tier: 'sonnet', maxOutput: 3000, modules: 700 },
      demand_response: { tier: 'sonnet', maxOutput: 3500, modules: 1100 },
      risk_assessment: { tier: 'haiku', maxOutput: 1500, modules: 700 },
      provision_check: { tier: 'haiku', maxOutput: 1000, modules: 700 },
      clause_generate: { tier: 'haiku', maxOutput: 800, modules: 700 },
      compliance_check: { tier: 'sonnet', maxOutput: 2000, modules: 1500 },
      summary_generate: { tier: 'haiku', maxOutput: 800, modules: 0 },
    };
    const tmpl = templates[actionId] || templates['risk_assessment'];
    const pricing = tiers[tmpl.tier];
    const systemTokens = 2000;
    const docTokens = Math.floor(documentLength / 4);
    const totalInput = systemTokens + tmpl.modules + docTokens + 400;
    const inputCost = (totalInput * pricing.input) / 1_000_000;
    const outputCost = (tmpl.maxOutput * pricing.output) / 1_000_000;
    const cacheSavings = ((systemTokens + tmpl.modules) * 0.9 * pricing.input) / 1_000_000;
    const cost = Math.max(inputCost + outputCost - cacheSavings, 0.0001);
    return {
      estimated_cost_usd: +cost.toFixed(6), estimated_cost_sar: +(cost * 3.75).toFixed(4),
      input_tokens: totalInput, output_tokens: tmpl.maxOutput,
      model: tmpl.tier as any,
      model_id: tmpl.tier === 'sonnet' ? 'claude-sonnet-4-5-20250929' : 'claude-haiku-4-5-20251001',
      cache_eligible: true,
    };
  }

  async analyzeContract(params: ContractReviewParams): Promise<AIAnalysisResult> {
    return this._executeAction('contract_review', params);
  }
  async assessRisk(params: RiskAssessmentParams): Promise<AIAnalysisResult> {
    return this._executeAction('risk_assessment', params);
  }
  async generateSummary(params: SummaryGenerateParams): Promise<AIAnalysisResult> {
    return this._executeAction('summary_generate', params);
  }
  async executeAction(actionId: AIActionId, params: Record<string, any>): Promise<AIAnalysisResult> {
    return this._executeAction(actionId, params);
  }

  async reviewAnalysis(analysisId: string, status: 'reviewed' | 'rejected', notes: string = ''): Promise<void> {
    this._analyses.update(list => list.map(a => a.id === analysisId ? { ...a, status } : a));
  }

  private async _executeAction(actionId: AIActionId, params: Record<string, any>): Promise<AIAnalysisResult> {
    this._loading.set(true);
    try {
      await new Promise(r => setTimeout(r, 1500 + Math.random() * 2000));
      const result = this._generateMockResult(actionId, params);
      this._lastResult.set(result);
      if (result.success) {
        const analysis: AIAnalysis = {
          id: result.analysis_id, action_id: actionId, risk_score: result.risk_score,
          executive_summary: result.executive_summary, status: result.status,
          model_used: result.model_used, cost_sar: result.cost_sar || 0,
          created_at: new Date().toISOString(),
        };
        this._analyses.update(list => [analysis, ...list]);
        this._budget.update(b => ({
          ...b, monthly_calls: b.monthly_calls + 1,
          monthly_cost_usd: +(b.monthly_cost_usd + result.cost_usd).toFixed(4),
          monthly_cost_sar: +(b.monthly_cost_sar + (result.cost_sar || 0)).toFixed(2),
          usage_percent: +((b.monthly_cost_usd + result.cost_usd) / b.limit_usd * 100).toFixed(1),
        }));
      }
      return result;
    } finally { this._loading.set(false); }
  }

  private _generateMockResult(actionId: AIActionId, params: Record<string, any>): AIAnalysisResult {
    const id = `ai-${Date.now().toString(36)}`;
    const baseCost = this.estimateCost(actionId, 5000);

    if (actionId === 'contract_review' || actionId === 'compliance_check') {
      return {
        success: true, cached: false, analysis_id: id,
        findings: [
          { section: 'البند 5.2', provision_text: 'شرط التعويض غير المحدود', severity: 'critical', risk_type: 'liability_shift', analysis_ar: 'يتضمن العقد شرط تعويض غير محدود المسؤولية مما يعرض العميل لمخاطر مالية كبيرة.', recommendation_ar: 'تحديد سقف أعلى للتعويض لا يتجاوز قيمة العقد.', counter_language_ar: 'يلتزم الطرف المخل بتعويض الطرف الآخر عن الأضرار المباشرة فقط وبما لا يتجاوز إجمالي قيمة العقد.', saudi_law_reference: 'نظام المعاملات المدنية - المادة 136' },
          { section: 'البند 8.1', provision_text: 'شرط عدم المنافسة', severity: 'high', risk_type: 'saudi_non_compliance', analysis_ar: 'مدة شرط عدم المنافسة (5 سنوات) تتجاوز الحد المسموح به في النظام السعودي.', recommendation_ar: 'تقليص المدة إلى سنتين كحد أقصى وفقاً لنظام العمل.', counter_language_ar: 'يلتزم الطرف الثاني بعدم المنافسة لمدة لا تتجاوز سنتين من تاريخ انتهاء العقد.', saudi_law_reference: 'نظام العمل - المادة 83' },
          { section: 'البند 12.3', provision_text: 'اختيار القانون الأجنبي', severity: 'high', risk_type: 'saudi_non_compliance', analysis_ar: 'اختيار قانون أجنبي كقانون حاكم قد لا يكون نافذاً أمام المحاكم السعودية.', recommendation_ar: 'تحديد النظام السعودي كقانون حاكم أو إضافة شرط التحكيم.', counter_language_ar: 'يخضع هذا العقد لأنظمة المملكة العربية السعودية وتختص محاكمها بنظر أي نزاع.', saudi_law_reference: 'نظام التحكيم - المادة 2' },
          { section: 'البند 3.4', provision_text: 'شروط الدفع', severity: 'medium', risk_type: 'ambiguity', analysis_ar: 'لم يتم تحديد آلية واضحة لتسوية الفواتير المتنازع عليها.', recommendation_ar: 'إضافة آلية واضحة لتسوية الخلافات المالية خلال 30 يوم عمل.', counter_language_ar: 'في حال وجود خلاف حول أي فاتورة، يتم تسوية المبلغ غير المتنازع عليه فوراً والمتنازع عليه خلال 30 يوم عمل.', saudi_law_reference: null },
        ],
        missing_provisions: [
          { provision: 'شرط القوة القاهرة', importance: 'required', reason_ar: 'لا يتضمن العقد بنداً للقوة القاهرة وهو مطلب أساسي في العقود التجارية.' },
          { provision: 'شرط حماية البيانات الشخصية', importance: 'required', reason_ar: 'يجب تضمين بند يتوافق مع نظام حماية البيانات الشخصية (PDPL).' },
          { provision: 'آلية تسوية النزاعات', importance: 'recommended', reason_ar: 'يُفضل إضافة شرط تحكيم أو وساطة قبل اللجوء للقضاء.' },
        ],
        risk_score: 7, executive_summary: 'يتضمن العقد عدة مخاطر جوهرية تتطلب معالجة فورية. أبرزها شرط التعويض غير المحدود وشرط عدم المنافسة المخالف لنظام العمل السعودي. كما يفتقر العقد لبنود أساسية مثل القوة القاهرة وحماية البيانات الشخصية.',
        status: 'completed', model_used: 'claude-sonnet-4-5-20250929',
        cost_usd: baseCost.estimated_cost_usd, cost_sar: baseCost.estimated_cost_sar,
        tokens: { input: baseCost.input_tokens, output: baseCost.output_tokens, cache_read: 1800, cache_creation: 0 },
      };
    }

    if (actionId === 'risk_assessment') {
      return {
        success: true, cached: false, analysis_id: id,
        findings: [
          { category: 'المخاطر القانونية', risk_level: 'high', description_ar: 'وجود بنود قد تخالف الأنظمة السعودية', impact_ar: 'قد يؤدي لبطلان أجزاء من العقد', mitigation_ar: 'مراجعة البنود مع مستشار قانوني متخصص' },
          { category: 'المخاطر المالية', risk_level: 'medium', description_ar: 'غياب سقف للتعويضات', impact_ar: 'تعرض العميل لالتزامات مالية مفتوحة', mitigation_ar: 'تحديد سقف للتعويضات ضمن العقد' },
          { category: 'مخاطر الامتثال', risk_level: 'critical', description_ar: 'عدم الامتثال لنظام حماية البيانات الشخصية', impact_ar: 'غرامات وعقوبات من الجهات الرقابية', mitigation_ar: 'إضافة بنود PDPL وتعيين مسؤول حماية بيانات' },
        ] as any,
        missing_provisions: [], risk_score: 6,
        executive_summary: 'المستند يحمل مخاطر متوسطة إلى عالية تتركز في عدم الامتثال التنظيمي والتعرض المالي.',
        status: 'completed', model_used: 'claude-haiku-4-5-20251001',
        cost_usd: baseCost.estimated_cost_usd, cost_sar: baseCost.estimated_cost_sar,
      };
    }

    return {
      success: true, cached: false, analysis_id: id,
      findings: [], missing_provisions: [], risk_score: 5,
      executive_summary: 'تم إكمال التحليل بنجاح. يرجى مراجعة النتائج.',
      status: 'completed', model_used: baseCost.model_id,
      cost_usd: baseCost.estimated_cost_usd, cost_sar: baseCost.estimated_cost_sar,
    };
  }
}
