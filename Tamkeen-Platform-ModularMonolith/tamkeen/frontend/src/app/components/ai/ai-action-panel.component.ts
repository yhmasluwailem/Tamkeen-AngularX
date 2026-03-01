import { Component, Input, Output, EventEmitter, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AIEngineService } from '../../core/services/ai-engine.service';
import {
  AIActionId, AIAnalysisResult, CostEstimate, Severity
} from '../../core/models/ai';

@Component({
  selector: 'ai-action-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="ai-panel" dir="rtl">

      <!-- HEADER -->
      <div class="ai-panel__header">
        <div class="ai-panel__icon">
          <i class="bi bi-cpu"></i>
        </div>
        <div class="ai-panel__title-block">
          <h3>التحليل الذكي</h3>
          <span class="ai-panel__badge">
            <i class="bi bi-shield-check"></i>
            يتطلب مراجعة المحامي
          </span>
        </div>
        <button class="ai-panel__toggle" (click)="expanded.set(!expanded())">
          <i class="bi" [class.bi-chevron-up]="expanded()" [class.bi-chevron-down]="!expanded()"></i>
        </button>
      </div>

      @if (expanded()) {
        <!-- ACTION SELECTOR -->
        <div class="ai-panel__section">
          <label class="ai-panel__label">نوع التحليل</label>
          <div class="ai-panel__action-grid">
            @for (action of filteredActions(); track action.action_id) {
              <button
                class="ai-action-chip"
                [class.active]="selectedAction() === action.action_id"
                (click)="selectAction(action.action_id)">
                <i class="bi" [class]="getActionIcon(action.action_id)"></i>
                <span>{{ action.name_ar }}</span>
                <span class="tier-badge" [class]="'tier-' + action.model_tier">
                  {{ action.model_tier === 'sonnet' ? 'متقدم' : 'سريع' }}
                </span>
              </button>
            }
          </div>
        </div>

        <!-- DYNAMIC PARAMS based on selected action -->
        @if (selectedAction()) {

          <!-- Contract Review Params -->
          @if (selectedAction() === 'contract_review') {
            <div class="ai-panel__section">
              <div class="ai-param-group">
                <label class="ai-panel__label">المنظور</label>
                <div class="ai-radio-group">
                  <button [class.active]="params.party_role === 'client'"
                          (click)="params.party_role = 'client'; updateCost()">
                    <i class="bi bi-person"></i> العميل
                  </button>
                  <button [class.active]="params.party_role === 'counterparty'"
                          (click)="params.party_role = 'counterparty'; updateCost()">
                    <i class="bi bi-people"></i> الطرف الآخر
                  </button>
                </div>
              </div>
              <div class="ai-param-group">
                <label class="ai-panel__label">نوع المراجعة</label>
                <select class="ai-select" [(ngModel)]="params.review_mode" (ngModelChange)="updateCost()">
                  <option value="full">شاملة</option>
                  <option value="risk_only">المخاطر فقط</option>
                  <option value="compliance">الامتثال</option>
                </select>
              </div>
              <div class="ai-param-group">
                <label class="ai-panel__label">مستوى الخطورة</label>
                <div class="ai-radio-group">
                  <button [class.active]="params.severity_filter === 'all'"
                          (click)="params.severity_filter = 'all'; updateCost()">الكل</button>
                  <button [class.active]="params.severity_filter === 'high_critical'"
                          (click)="params.severity_filter = 'high_critical'; updateCost()">عالية وحرجة فقط</button>
                </div>
              </div>
              <div class="ai-toggles">
                <label class="ai-toggle">
                  <input type="checkbox" [(ngModel)]="params.include_market_benchmark">
                  <span class="ai-toggle__slider"></span>
                  <span>مقارنة سوقية</span>
                </label>
                <label class="ai-toggle">
                  <input type="checkbox" [(ngModel)]="params.include_missing_provisions">
                  <span class="ai-toggle__slider"></span>
                  <span>بنود مفقودة</span>
                </label>
              </div>
            </div>
          }

          <!-- Risk Assessment Params -->
          @if (selectedAction() === 'risk_assessment') {
            <div class="ai-panel__section">
              <div class="ai-param-group">
                <label class="ai-panel__label">المنظور</label>
                <div class="ai-radio-group">
                  <button [class.active]="params.party_role === 'client'"
                          (click)="params.party_role = 'client'; updateCost()">العميل</button>
                  <button [class.active]="params.party_role === 'counterparty'"
                          (click)="params.party_role = 'counterparty'; updateCost()">الطرف الآخر</button>
                </div>
              </div>
              <div class="ai-param-group">
                <label class="ai-panel__label">فئات المخاطر</label>
                <select class="ai-select" [(ngModel)]="params.risk_categories" (ngModelChange)="updateCost()">
                  <option value="all">جميع الفئات</option>
                  <option value="financial">مالية</option>
                  <option value="legal">قانونية</option>
                  <option value="compliance">امتثال</option>
                  <option value="operational">تشغيلية</option>
                </select>
              </div>
            </div>
          }

          <!-- Compliance Check Params -->
          @if (selectedAction() === 'compliance_check') {
            <div class="ai-panel__section">
              <div class="ai-param-group">
                <label class="ai-panel__label">نوع المستند</label>
                <select class="ai-select" [(ngModel)]="params.document_type" (ngModelChange)="updateCost()">
                  <option value="contract">عقد</option>
                  <option value="policy">سياسة</option>
                  <option value="agreement">اتفاقية</option>
                  <option value="license">رخصة</option>
                </select>
              </div>
              <div class="ai-param-group">
                <label class="ai-panel__label">القطاع</label>
                <select class="ai-select" [(ngModel)]="params.industry_sector" (ngModelChange)="updateCost()">
                  <option value="general">عام</option>
                  <option value="banking">مصرفي</option>
                  <option value="insurance">تأمين</option>
                  <option value="healthcare">صحي</option>
                  <option value="technology">تقني</option>
                  <option value="construction">إنشاءات</option>
                  <option value="retail">تجزئة</option>
                </select>
              </div>
              <div class="ai-param-group">
                <label class="ai-panel__label">التركيز التنظيمي</label>
                <select class="ai-select" [(ngModel)]="params.regulatory_focus" (ngModelChange)="updateCost()">
                  <option value="all">شامل</option>
                  <option value="pdpl">حماية البيانات (PDPL)</option>
                  <option value="labor">نظام العمل</option>
                  <option value="commercial">النظام التجاري</option>
                  <option value="investment">الاستثمار</option>
                  <option value="anti_ml">مكافحة غسل الأموال</option>
                </select>
              </div>
            </div>
          }

          <!-- Summary Generate Params -->
          @if (selectedAction() === 'summary_generate') {
            <div class="ai-panel__section">
              <div class="ai-param-group">
                <label class="ai-panel__label">نوع الملخص</label>
                <select class="ai-select" [(ngModel)]="params.summary_type" (ngModelChange)="updateCost()">
                  <option value="brief">مختصر</option>
                  <option value="detailed">تفصيلي</option>
                  <option value="key_terms">البنود الرئيسية</option>
                  <option value="obligations">الالتزامات</option>
                </select>
              </div>
              <div class="ai-param-group">
                <label class="ai-panel__label">اللغة</label>
                <div class="ai-radio-group">
                  <button [class.active]="params.language === 'ar'" (click)="params.language = 'ar'">عربي</button>
                  <button [class.active]="params.language === 'en'" (click)="params.language = 'en'">English</button>
                  <button [class.active]="params.language === 'both'" (click)="params.language = 'both'">كلاهما</button>
                </div>
              </div>
            </div>
          }

          <!-- DOCUMENT SELECTOR (always shown when action selected) -->
          @if (documents.length) {
            <div class="ai-panel__section">
              <label class="ai-panel__label">المستند</label>
              <select class="ai-select" [(ngModel)]="selectedDocumentId" (ngModelChange)="updateCost()">
                <option value="">— اختر المستند —</option>
                @for (doc of documents; track doc.id) {
                  <option [value]="doc.id">{{ doc.title }}</option>
                }
              </select>
            </div>
          }

          <!-- COST ESTIMATE -->
          @if (costEstimate()) {
            <div class="ai-cost-bar">
              <div class="ai-cost-bar__item">
                <i class="bi bi-coin"></i>
                <span>التكلفة التقديرية</span>
                <strong>{{ costEstimate()!.estimated_cost_sar | number:'1.2-2' }} ر.س</strong>
              </div>
              <div class="ai-cost-bar__item">
                <i class="bi bi-cpu"></i>
                <span>النموذج</span>
                <strong>{{ costEstimate()!.model === 'sonnet' ? 'Claude Sonnet' : 'Claude Haiku' }}</strong>
              </div>
            </div>
          }

          <!-- BUDGET WARNING -->
          @if (aiService.budget().at_alert_threshold) {
            <div class="ai-warning">
              <i class="bi bi-exclamation-triangle-fill"></i>
              <span>تم استخدام {{ aiService.budget().usage_percent }}% من الميزانية الشهرية</span>
            </div>
          }

          <!-- EXECUTE BUTTON -->
          <button
            class="ai-execute-btn"
            (click)="runAnalysis()"
            [disabled]="aiService.loading() || !selectedDocumentId || !selectedAction()">
            @if (aiService.loading()) {
              <span class="ai-spinner"></span>
              <span>جاري التحليل...</span>
            } @else {
              <i class="bi bi-lightning-charge-fill"></i>
              <span>تحليل</span>
            }
          </button>
        }
      }
    </div>
  `,
  styles: [`
    .ai-panel {
      background: var(--tmk-card-bg);
      border: 1px solid var(--tmk-border-color);
      border-radius: var(--tmk-border-radius);
      overflow: hidden;
      box-shadow: var(--tmk-shadow-card);
    }
    .ai-panel__header {
      display: flex; align-items: center; gap: 0.75rem;
      padding: 1rem 1.25rem;
      background: linear-gradient(135deg, #0F766E08 0%, #1B835408 100%);
      border-bottom: 1px solid var(--tmk-border-color);
    }
    .ai-panel__icon {
      width: 40px; height: 40px; border-radius: 10px;
      background: linear-gradient(135deg, #0F766E, #1B8354);
      display: flex; align-items: center; justify-content: center;
      color: white; font-size: 1.15rem;
    }
    .ai-panel__title-block { flex: 1; }
    .ai-panel__title-block h3 { margin: 0; font-size: 0.95rem; font-weight: 700; color: var(--tmk-sidebar-bg); }
    .ai-panel__badge {
      display: inline-flex; align-items: center; gap: 0.3rem; margin-top: 0.15rem;
      font-size: 0.7rem; color: #9DA4AE;
    }
    .ai-panel__badge i { font-size: 0.65rem; color: var(--tmk-primary); }
    .ai-panel__toggle {
      width: 32px; height: 32px; border-radius: 8px;
      border: 1px solid var(--tmk-border-color); background: transparent;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; color: #6C737F; transition: all 150ms;
    }
    .ai-panel__toggle:hover { background: #F3F4F6; color: #111927; }

    .ai-panel__section { padding: 1rem 1.25rem; border-bottom: 1px solid #F3F4F6; }
    .ai-panel__label { display: block; font-size: 0.78rem; font-weight: 600; color: #384250; margin-bottom: 0.5rem; }

    .ai-panel__action-grid { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .ai-action-chip {
      display: inline-flex; align-items: center; gap: 0.4rem;
      padding: 0.45rem 0.85rem; border-radius: 8px; font-size: 0.78rem;
      border: 1px solid var(--tmk-border-color); background: white;
      cursor: pointer; transition: all 150ms; color: #384250; white-space: nowrap;
    }
    .ai-action-chip:hover { border-color: var(--tmk-primary); color: var(--tmk-primary); background: var(--tmk-primary-light); }
    .ai-action-chip.active { border-color: var(--tmk-primary); color: white; background: var(--tmk-primary); }
    .ai-action-chip.active .tier-badge { background: rgba(255,255,255,0.2); color: white; }
    .tier-badge {
      font-size: 0.6rem; padding: 0.1rem 0.35rem; border-radius: 4px; font-weight: 600;
    }
    .tier-badge.tier-sonnet { background: #EDE9FE; color: #7C3AED; }
    .tier-badge.tier-haiku { background: #ECFDF5; color: #059669; }

    .ai-param-group { margin-bottom: 0.75rem; }
    .ai-param-group:last-child { margin-bottom: 0; }

    .ai-radio-group { display: flex; gap: 0.5rem; }
    .ai-radio-group button {
      flex: 1; padding: 0.5rem; border-radius: 8px; font-size: 0.8rem;
      border: 1px solid var(--tmk-border-color); background: white;
      cursor: pointer; transition: all 150ms; text-align: center; color: #384250;
    }
    .ai-radio-group button:hover { border-color: var(--tmk-primary); }
    .ai-radio-group button.active {
      border-color: var(--tmk-primary); background: var(--tmk-primary);
      color: white; font-weight: 600;
    }

    .ai-select {
      width: 100%; padding: 0.5rem 0.75rem; border-radius: 8px; font-size: 0.8rem;
      border: 1px solid var(--tmk-border-color); background: white; color: #384250;
      font-family: inherit; outline: none; transition: border-color 150ms;
    }
    .ai-select:focus { border-color: var(--tmk-primary); }

    .ai-toggles { display: flex; flex-direction: column; gap: 0.5rem; margin-top: 0.5rem; }
    .ai-toggle {
      display: flex; align-items: center; gap: 0.65rem; cursor: pointer;
      font-size: 0.8rem; color: #384250;
    }
    .ai-toggle input { display: none; }
    .ai-toggle__slider {
      width: 36px; height: 20px; border-radius: 10px;
      background: #D1D5DB; position: relative; transition: background 200ms;
    }
    .ai-toggle__slider::before {
      content: ''; width: 16px; height: 16px; border-radius: 50%;
      background: white; position: absolute; top: 2px; right: 2px;
      transition: transform 200ms; box-shadow: 0 1px 2px rgba(0,0,0,0.15);
    }
    .ai-toggle input:checked + .ai-toggle__slider { background: var(--tmk-primary); }
    .ai-toggle input:checked + .ai-toggle__slider::before { transform: translateX(-16px); }

    .ai-cost-bar {
      display: flex; gap: 1rem; padding: 0.75rem 1.25rem;
      background: #F9FAFB; border-bottom: 1px solid #F3F4F6;
    }
    .ai-cost-bar__item {
      display: flex; align-items: center; gap: 0.4rem;
      font-size: 0.75rem; color: #6C737F;
    }
    .ai-cost-bar__item strong { color: #111927; }
    .ai-cost-bar__item i { font-size: 0.85rem; color: var(--tmk-primary); }

    .ai-warning {
      display: flex; align-items: center; gap: 0.5rem;
      padding: 0.65rem 1.25rem; background: #FEF3C7;
      font-size: 0.78rem; color: #92400E;
    }
    .ai-warning i { color: #F59E0B; }

    .ai-execute-btn {
      display: flex; align-items: center; justify-content: center; gap: 0.5rem;
      width: calc(100% - 2.5rem); margin: 1rem 1.25rem;
      padding: 0.7rem; border-radius: 10px; font-size: 0.88rem; font-weight: 700;
      border: none; cursor: pointer; transition: all 200ms;
      background: linear-gradient(135deg, #0F766E, #1B8354);
      color: white; font-family: inherit;
    }
    .ai-execute-btn:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(27,131,84,0.25); }
    .ai-execute-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    .ai-spinner {
      width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white; border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class AIActionPanelComponent {
  @Input() caseId = '';
  @Input() courtType = 'commercial';
  @Input() documents: { id: string; title: string; file_size?: number }[] = [];
  @Output() analysisComplete = new EventEmitter<AIAnalysisResult>();

  aiService = inject(AIEngineService);

  expanded = signal(true);
  selectedAction = signal<AIActionId | null>(null);
  selectedDocumentId = '';
  costEstimate = signal<CostEstimate | null>(null);

  params: Record<string, any> = {
    party_role: 'client',
    review_mode: 'full',
    severity_filter: 'all',
    include_market_benchmark: false,
    include_missing_provisions: true,
    risk_categories: 'all',
    document_type: 'contract',
    industry_sector: 'general',
    regulatory_focus: 'all',
    summary_type: 'brief',
    language: 'ar',
  };

  filteredActions = computed(() => {
    return this.aiService.availableActions;
  });

  selectAction(actionId: AIActionId) {
    this.selectedAction.set(actionId);
    this.updateCost();
  }

  updateCost() {
    const action = this.selectedAction();
    if (!action) return;
    const docLength = 5000; // Default estimate
    const estimate = this.aiService.estimateCost(action, docLength);
    this.costEstimate.set(estimate);
  }

  async runAnalysis() {
    const action = this.selectedAction();
    if (!action || !this.selectedDocumentId) return;

    const allParams = {
      ...this.params,
      case_id: this.caseId,
      document_id: this.selectedDocumentId,
      court_type: this.courtType,
    };

    const result = await this.aiService.executeAction(action, allParams);
    this.analysisComplete.emit(result);
  }

  getActionIcon(actionId: AIActionId): string {
    const icons: Record<string, string> = {
      contract_review: 'bi-file-earmark-text',
      counter_analysis: 'bi-arrow-left-right',
      demand_response: 'bi-envelope-paper',
      risk_assessment: 'bi-shield-exclamation',
      provision_check: 'bi-list-check',
      clause_generate: 'bi-pencil-square',
      compliance_check: 'bi-patch-check',
      summary_generate: 'bi-card-text',
    };
    return icons[actionId] || 'bi-cpu';
  }
}
