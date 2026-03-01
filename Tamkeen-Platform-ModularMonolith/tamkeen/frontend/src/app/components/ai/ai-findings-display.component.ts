import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AIAnalysisResult, AIFinding, MissingProvision, RiskCategory,
  Severity, AnalysisStatus, AIActionId
} from '../../core/models/ai';

@Component({
  selector: 'ai-findings-display',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="ai-results" dir="rtl">

      <!-- RESULT HEADER -->
      <div class="ai-results__header">
        <div class="ai-results__header-right">
          <div class="ai-results__icon">
            <i class="bi bi-cpu-fill"></i>
          </div>
          <div>
            <h3>نتائج التحليل الذكي</h3>
            <div class="ai-results__meta">
              <span class="meta-chip">
                <i class="bi bi-clock"></i> {{ timeAgo(result.analysis_id) }}
              </span>
              <span class="meta-chip">
                <i class="bi bi-cpu"></i> {{ result.model_used.includes('sonnet') ? 'Sonnet' : 'Haiku' }}
              </span>
              <span class="meta-chip" [class.cached]="result.cached">
                <i class="bi" [class.bi-lightning-fill]="result.cached" [class.bi-cloud-arrow-up]="!result.cached"></i>
                {{ result.cached ? 'نتيجة محفوظة' : 'تحليل جديد' }}
              </span>
              @if (result.cost_sar) {
                <span class="meta-chip">
                  <i class="bi bi-coin"></i> {{ result.cost_sar | number:'1.2-2' }} ر.س
                </span>
              }
            </div>
          </div>
        </div>
        <div class="ai-results__status" [class]="'status-' + result.status">
          {{ statusLabel(result.status) }}
        </div>
      </div>

      <!-- RISK SCORE CARD -->
      @if (result.risk_score !== null) {
        <div class="ai-risk-score" [class]="'risk-level-' + riskLevel()">
          <div class="risk-score__ring">
            <svg viewBox="0 0 60 60">
              <circle cx="30" cy="30" r="26" fill="none" stroke="#E5E7EB" stroke-width="4"/>
              <circle cx="30" cy="30" r="26" fill="none" [attr.stroke]="riskColor()"
                      stroke-width="4" stroke-linecap="round"
                      [attr.stroke-dasharray]="riskDash()" stroke-dashoffset="0"
                      transform="rotate(-90 30 30)"/>
            </svg>
            <span class="risk-score__value">{{ result.risk_score }}</span>
          </div>
          <div class="risk-score__info">
            <strong>مستوى المخاطر: {{ riskLabel() }}</strong>
            <p>{{ result.executive_summary }}</p>
          </div>
        </div>
      }

      <!-- EXECUTIVE SUMMARY (when no risk score) -->
      @if (result.risk_score === null && result.executive_summary) {
        <div class="ai-summary-card">
          <i class="bi bi-chat-text"></i>
          <p>{{ result.executive_summary }}</p>
        </div>
      }

      <!-- FINDINGS TABLE -->
      @if (asFindings().length) {
        <div class="ai-findings-section">
          <h4>
            <i class="bi bi-exclamation-diamond"></i>
            النتائج
            <span class="count-badge">{{ asFindings().length }}</span>
          </h4>

          <!-- Severity filter tabs -->
          <div class="severity-tabs">
            <button [class.active]="severityFilter() === 'all'" (click)="severityFilter.set('all')">
              الكل <span class="tab-count">{{ asFindings().length }}</span>
            </button>
            @for (sev of severityCounts(); track sev.key) {
              <button [class.active]="severityFilter() === sev.key"
                      [class]="'sev-' + sev.key"
                      (click)="severityFilter.set(sev.key)">
                {{ sevLabel(sev.key) }} <span class="tab-count">{{ sev.count }}</span>
              </button>
            }
          </div>

          <!-- Finding cards -->
          @for (f of filteredFindings(); track f.section) {
            <div class="finding-card" [class]="'sev-border-' + f.severity">
              <div class="finding-card__top">
                <span class="severity-badge" [class]="'sev-bg-' + f.severity">
                  {{ sevLabel(f.severity) }}
                </span>
                <span class="section-ref">البند {{ f.section }}</span>
                @if (f.risk_type) {
                  <span class="risk-type-badge">{{ riskTypeLabel(f.risk_type) }}</span>
                }
              </div>

              @if (f.provision_text) {
                <div class="finding-card__provision">
                  «{{ f.provision_text }}»
                </div>
              }

              <div class="finding-card__analysis">
                {{ f.analysis_ar }}
              </div>

              <div class="finding-card__rec">
                <div class="rec-item">
                  <i class="bi bi-lightbulb"></i>
                  <div>
                    <strong>التوصية</strong>
                    <p>{{ f.recommendation_ar }}</p>
                  </div>
                </div>
                @if (f.counter_language_ar) {
                  <div class="rec-item counter">
                    <i class="bi bi-pencil-square"></i>
                    <div>
                      <strong>صياغة مقترحة</strong>
                      <p>{{ f.counter_language_ar }}</p>
                      <button class="apply-counter-btn" (click)="applyCounterLanguage.emit(f)">
                        <i class="bi bi-clipboard-plus"></i> تطبيق الصياغة
                      </button>
                    </div>
                  </div>
                }
              </div>

              @if (f.saudi_law_reference) {
                <div class="finding-card__law">
                  <i class="bi bi-book"></i>
                  {{ f.saudi_law_reference }}
                </div>
              }
            </div>
          }
        </div>
      }

      <!-- RISK CATEGORIES (for risk_assessment) -->
      @if (asRiskCategories().length) {
        <div class="ai-findings-section">
          <h4>
            <i class="bi bi-shield-exclamation"></i>
            فئات المخاطر
            <span class="count-badge">{{ asRiskCategories().length }}</span>
          </h4>
          @for (cat of asRiskCategories(); track cat.category) {
            <div class="risk-cat-card" [class]="'sev-border-' + cat.risk_level">
              <div class="risk-cat-card__header">
                <span class="severity-badge" [class]="'sev-bg-' + cat.risk_level">
                  {{ sevLabel(cat.risk_level) }}
                </span>
                <strong>{{ cat.category }}</strong>
              </div>
              <p class="risk-cat-card__desc">{{ cat.description_ar }}</p>
              <div class="risk-cat-card__row">
                <div class="risk-cat-card__item">
                  <i class="bi bi-exclamation-triangle"></i>
                  <div>
                    <label>الأثر</label>
                    <p>{{ cat.impact_ar }}</p>
                  </div>
                </div>
                <div class="risk-cat-card__item">
                  <i class="bi bi-shield-check"></i>
                  <div>
                    <label>الإجراء الوقائي</label>
                    <p>{{ cat.mitigation_ar }}</p>
                  </div>
                </div>
              </div>
            </div>
          }
        </div>
      }

      <!-- MISSING PROVISIONS -->
      @if (result.missing_provisions?.length) {
        <div class="ai-findings-section">
          <h4>
            <i class="bi bi-file-earmark-x"></i>
            البنود المفقودة
            <span class="count-badge">{{ result.missing_provisions.length }}</span>
          </h4>
          @for (mp of result.missing_provisions; track mp.provision) {
            <div class="missing-card" [class.required]="mp.importance === 'required'">
              <div class="missing-card__header">
                <span class="importance-badge" [class]="mp.importance">
                  {{ mp.importance === 'required' ? 'مطلوب' : 'موصى به' }}
                </span>
                <strong>{{ mp.provision }}</strong>
              </div>
              <p>{{ mp.reason_ar }}</p>
            </div>
          }
        </div>
      }

      <!-- ATTORNEY REVIEW ACTIONS -->
      @if (result.status === 'completed') {
        <div class="ai-results__actions">
          <button class="review-btn approve" (click)="reviewAction.emit({ status: 'reviewed', notes: '' })">
            <i class="bi bi-check-circle"></i>
            الموافقة على التحليل
          </button>
          <button class="review-btn reject" (click)="reviewAction.emit({ status: 'rejected', notes: '' })">
            <i class="bi bi-x-circle"></i>
            رفض التحليل
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .ai-results { background: var(--tmk-card-bg); border: 1px solid var(--tmk-border-color); border-radius: var(--tmk-border-radius); overflow: hidden; box-shadow: var(--tmk-shadow-card); }

    .ai-results__header { display: flex; align-items: flex-start; justify-content: space-between; padding: 1.25rem; background: linear-gradient(135deg, #0F766E05, #1B835405); border-bottom: 1px solid var(--tmk-border-color); }
    .ai-results__header-right { display: flex; gap: 0.75rem; align-items: flex-start; }
    .ai-results__icon { width: 36px; height: 36px; border-radius: 8px; background: linear-gradient(135deg, #0F766E, #1B8354); display: flex; align-items: center; justify-content: center; color: white; font-size: 1rem; flex-shrink: 0; }
    .ai-results__header h3 { margin: 0; font-size: 0.9rem; font-weight: 700; }
    .ai-results__meta { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.35rem; }
    .meta-chip { display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.7rem; color: #6C737F; background: #F3F4F6; padding: 0.15rem 0.45rem; border-radius: 4px; }
    .meta-chip.cached { background: #ECFDF5; color: #059669; }
    .meta-chip i { font-size: 0.65rem; }

    .ai-results__status { padding: 0.3rem 0.75rem; border-radius: 6px; font-size: 0.72rem; font-weight: 600; }
    .status-completed { background: #FFFBEB; color: #B45309; }
    .status-reviewed { background: #ECFDF5; color: #059669; }
    .status-rejected { background: #FEF2F2; color: #DC2626; }
    .status-applied { background: #EDE9FE; color: #7C3AED; }
    .status-pending { background: #F3F4F6; color: #6C737F; }

    .ai-risk-score { display: flex; align-items: center; gap: 1.25rem; padding: 1.25rem; border-bottom: 1px solid var(--tmk-border-color); }
    .risk-score__ring { position: relative; width: 60px; height: 60px; flex-shrink: 0; }
    .risk-score__ring svg { width: 60px; height: 60px; }
    .risk-score__value { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 1.3rem; font-weight: 800; }
    .risk-level-low .risk-score__value { color: #059669; }
    .risk-level-medium .risk-score__value { color: #D97706; }
    .risk-level-high .risk-score__value { color: #EA580C; }
    .risk-level-critical .risk-score__value { color: #DC2626; }
    .risk-score__info { flex: 1; }
    .risk-score__info strong { display: block; font-size: 0.88rem; margin-bottom: 0.35rem; }
    .risk-score__info p { margin: 0; font-size: 0.8rem; color: #4B5563; line-height: 1.6; }

    .ai-summary-card { display: flex; gap: 0.75rem; padding: 1rem 1.25rem; background: #F8FAFC; border-bottom: 1px solid var(--tmk-border-color); }
    .ai-summary-card i { font-size: 1.1rem; color: var(--tmk-primary); margin-top: 2px; }
    .ai-summary-card p { margin: 0; font-size: 0.82rem; color: #374151; line-height: 1.7; }

    .ai-findings-section { padding: 1.25rem; }
    .ai-findings-section h4 { display: flex; align-items: center; gap: 0.5rem; font-size: 0.88rem; margin: 0 0 1rem; }
    .ai-findings-section h4 i { color: var(--tmk-primary); }
    .count-badge { font-size: 0.65rem; padding: 0.1rem 0.5rem; border-radius: 10px; background: var(--tmk-primary); color: white; }

    .severity-tabs { display: flex; gap: 0.35rem; margin-bottom: 1rem; flex-wrap: wrap; }
    .severity-tabs button {
      padding: 0.35rem 0.75rem; border-radius: 6px; font-size: 0.72rem; font-weight: 600;
      border: 1px solid var(--tmk-border-color); background: white; cursor: pointer;
      color: #6C737F; transition: all 150ms;
    }
    .severity-tabs button:hover { background: #F3F4F6; }
    .severity-tabs button.active { border-color: var(--tmk-primary); background: var(--tmk-primary); color: white; }
    .severity-tabs button.active .tab-count { background: rgba(255,255,255,0.25); }
    .tab-count { font-size: 0.6rem; padding: 0 0.3rem; border-radius: 4px; background: #F3F4F6; margin-inline-start: 0.25rem; }

    .finding-card { border: 1px solid var(--tmk-border-color); border-radius: 10px; padding: 1rem; margin-bottom: 0.75rem; transition: box-shadow 200ms; }
    .finding-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
    .sev-border-critical { border-right: 3px solid #DC2626; }
    .sev-border-high { border-right: 3px solid #EA580C; }
    .sev-border-medium { border-right: 3px solid #D97706; }
    .sev-border-low { border-right: 3px solid #059669; }

    .finding-card__top { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.65rem; flex-wrap: wrap; }
    .severity-badge { padding: 0.15rem 0.55rem; border-radius: 5px; font-size: 0.68rem; font-weight: 700; }
    .sev-bg-critical { background: #FEF2F2; color: #DC2626; }
    .sev-bg-high { background: #FFF7ED; color: #EA580C; }
    .sev-bg-medium { background: #FFFBEB; color: #D97706; }
    .sev-bg-low { background: #ECFDF5; color: #059669; }
    .section-ref { font-size: 0.75rem; color: #6C737F; font-weight: 600; }
    .risk-type-badge { font-size: 0.65rem; padding: 0.1rem 0.45rem; border-radius: 4px; background: #EDE9FE; color: #7C3AED; }

    .finding-card__provision { font-size: 0.8rem; color: #6C737F; font-style: italic; margin-bottom: 0.5rem; background: #F9FAFB; padding: 0.5rem; border-radius: 6px; }
    .finding-card__analysis { font-size: 0.82rem; color: #374151; line-height: 1.7; margin-bottom: 0.75rem; }

    .finding-card__rec { display: flex; flex-direction: column; gap: 0.65rem; }
    .rec-item { display: flex; gap: 0.65rem; padding: 0.65rem; border-radius: 8px; background: #F0FDF4; }
    .rec-item.counter { background: #EFF6FF; }
    .rec-item i { font-size: 1rem; color: #059669; margin-top: 2px; }
    .rec-item.counter i { color: #2563EB; }
    .rec-item strong { display: block; font-size: 0.72rem; margin-bottom: 0.25rem; color: #374151; }
    .rec-item p { margin: 0; font-size: 0.8rem; color: #4B5563; line-height: 1.6; }

    .apply-counter-btn {
      display: inline-flex; align-items: center; gap: 0.3rem; margin-top: 0.5rem;
      padding: 0.3rem 0.65rem; border-radius: 6px; font-size: 0.72rem;
      border: 1px solid #93C5FD; background: #DBEAFE; color: #1D4ED8;
      cursor: pointer; transition: all 150ms; font-family: inherit;
    }
    .apply-counter-btn:hover { background: #BFDBFE; }

    .finding-card__law { display: flex; align-items: center; gap: 0.4rem; margin-top: 0.65rem; padding-top: 0.65rem; border-top: 1px solid #F3F4F6; font-size: 0.75rem; color: #6C737F; }
    .finding-card__law i { color: var(--tmk-primary); }

    .risk-cat-card { border: 1px solid var(--tmk-border-color); border-radius: 10px; padding: 1rem; margin-bottom: 0.75rem; }
    .risk-cat-card__header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; }
    .risk-cat-card__header strong { font-size: 0.85rem; }
    .risk-cat-card__desc { font-size: 0.82rem; color: #4B5563; line-height: 1.6; margin: 0 0 0.75rem; }
    .risk-cat-card__row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
    .risk-cat-card__item { display: flex; gap: 0.5rem; padding: 0.65rem; border-radius: 8px; background: #F9FAFB; }
    .risk-cat-card__item i { font-size: 1rem; margin-top: 2px; }
    .risk-cat-card__item:first-child i { color: #EA580C; }
    .risk-cat-card__item:last-child i { color: #059669; }
    .risk-cat-card__item label { display: block; font-size: 0.68rem; font-weight: 600; color: #6C737F; margin-bottom: 0.2rem; }
    .risk-cat-card__item p { margin: 0; font-size: 0.78rem; color: #374151; }

    .missing-card { border: 1px solid var(--tmk-border-color); border-radius: 8px; padding: 0.85rem; margin-bottom: 0.5rem; }
    .missing-card.required { border-right: 3px solid #DC2626; }
    .missing-card__header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.4rem; }
    .missing-card__header strong { font-size: 0.82rem; }
    .importance-badge { font-size: 0.65rem; padding: 0.1rem 0.45rem; border-radius: 4px; font-weight: 600; }
    .importance-badge.required { background: #FEF2F2; color: #DC2626; }
    .importance-badge.recommended { background: #FFFBEB; color: #D97706; }
    .missing-card p { margin: 0; font-size: 0.78rem; color: #4B5563; line-height: 1.6; }

    .ai-results__actions { display: flex; gap: 0.75rem; padding: 1.25rem; border-top: 1px solid var(--tmk-border-color); }
    .review-btn {
      flex: 1; display: flex; align-items: center; justify-content: center; gap: 0.4rem;
      padding: 0.65rem; border-radius: 8px; font-size: 0.82rem; font-weight: 600;
      border: none; cursor: pointer; transition: all 150ms; font-family: inherit;
    }
    .review-btn.approve { background: #ECFDF5; color: #059669; }
    .review-btn.approve:hover { background: #D1FAE5; }
    .review-btn.reject { background: #FEF2F2; color: #DC2626; }
    .review-btn.reject:hover { background: #FEE2E2; }

    @media (max-width: 768px) {
      .risk-cat-card__row { grid-template-columns: 1fr; }
      .ai-results__actions { flex-direction: column; }
    }
  `]
})
export class AIFindingsDisplayComponent {
  @Input() result!: AIAnalysisResult;
  @Input() actionId: AIActionId = 'contract_review';
  @Output() applyCounterLanguage = new EventEmitter<AIFinding>();
  @Output() reviewAction = new EventEmitter<{ status: 'reviewed' | 'rejected'; notes: string }>();

  severityFilter = signal<Severity | 'all'>('all');

  asFindings = computed((): AIFinding[] => {
    const findings = this.result?.findings || [];
    if (findings.length === 0) return [];
    if ('section' in findings[0]) return findings as AIFinding[];
    return [];
  });

  asRiskCategories = computed((): RiskCategory[] => {
    const findings = this.result?.findings || [];
    if (findings.length === 0) return [];
    if ('category' in findings[0]) return findings as any as RiskCategory[];
    return [];
  });

  severityCounts = computed(() => {
    const findings = this.asFindings();
    const counts: Record<string, number> = {};
    for (const f of findings) {
      counts[f.severity] = (counts[f.severity] || 0) + 1;
    }
    return Object.entries(counts)
      .map(([key, count]) => ({ key: key as Severity, count }))
      .sort((a, b) => this.sevOrder(a.key) - this.sevOrder(b.key));
  });

  filteredFindings = computed(() => {
    const filter = this.severityFilter();
    const findings = this.asFindings();
    if (filter === 'all') return findings;
    return findings.filter(f => f.severity === filter);
  });

  riskLevel = computed((): string => {
    const score = this.result?.risk_score;
    if (!score) return 'low';
    if (score >= 8) return 'critical';
    if (score >= 6) return 'high';
    if (score >= 4) return 'medium';
    return 'low';
  });

  riskColor(): string {
    const colors: Record<string, string> = {
      low: '#059669', medium: '#D97706', high: '#EA580C', critical: '#DC2626'
    };
    return colors[this.riskLevel()] || '#059669';
  }

  riskDash(): string {
    const score = this.result?.risk_score || 0;
    const circumference = 2 * Math.PI * 26;
    const progress = (score / 10) * circumference;
    return `${progress} ${circumference}`;
  }

  riskLabel(): string {
    const labels: Record<string, string> = {
      low: 'منخفض', medium: 'متوسط', high: 'مرتفع', critical: 'حرج'
    };
    return labels[this.riskLevel()] || 'غير محدد';
  }

  sevLabel(sev: Severity): string {
    const labels: Record<string, string> = {
      critical: 'حرج', high: 'مرتفع', medium: 'متوسط', low: 'منخفض'
    };
    return labels[sev] || sev;
  }

  riskTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      liability_shift: 'نقل المسؤولية',
      missing_protection: 'حماية مفقودة',
      saudi_non_compliance: 'مخالفة سعودية',
      ambiguity: 'غموض',
    };
    return labels[type] || type;
  }

  statusLabel(status: AnalysisStatus): string {
    const labels: Record<string, string> = {
      pending: 'قيد التحليل', completed: 'بانتظار المراجعة',
      reviewed: 'تمت الموافقة', rejected: 'مرفوض', applied: 'تم التطبيق',
    };
    return labels[status] || status;
  }

  timeAgo(id: string): string {
    return 'الآن';
  }

  private sevOrder(sev: Severity): number {
    return { critical: 0, high: 1, medium: 2, low: 3 }[sev] ?? 4;
  }
}
