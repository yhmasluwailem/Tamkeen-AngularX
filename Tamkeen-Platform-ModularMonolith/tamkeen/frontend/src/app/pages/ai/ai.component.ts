import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AIEngineService } from '../../core/services/ai-engine.service';
import { AIUsageWidgetComponent } from '../../components/ai/ai-usage-widget.component';
import { AIAnalysisHistoryComponent } from '../../components/ai/ai-analysis-history.component';
import { AIFindingsDisplayComponent } from '../../components/ai/ai-findings-display.component';
import { DashboardLayoutComponent } from '../../layouts/dashboard/dashboard-layout.component';

@Component({
  selector: 'app-ai',
  standalone: true,
  imports: [CommonModule, RouterModule, DashboardLayoutComponent, AIUsageWidgetComponent, AIAnalysisHistoryComponent, AIFindingsDisplayComponent],
  template: `
    <app-dashboard-layout>
      <div class="ai-page" dir="rtl">

        <!-- Page Header -->
        <div class="tmk-page-header">
          <div>
            <h1 class="tmk-page-header__title">
              <i class="bi bi-cpu-fill" style="color:#818CF8;margin-left:0.5rem"></i>
              التحليل الذكي
            </h1>
            <p class="tmk-page-header__subtitle">مركز الذكاء الاصطناعي لتحليل المستندات القانونية</p>
          </div>
          <a routerLink="/cases" class="btn-tmk-primary" style="display:inline-flex;align-items:center;gap:0.5rem;text-decoration:none;padding:0.6rem 1.25rem;border-radius:8px;font-size:0.875rem;font-weight:600;background:#1B8354;color:#fff">
            <i class="bi bi-briefcase-fill"></i>
            انتقل للقضايا
          </a>
        </div>

        <!-- Budget + Quick Stats Row -->
        <div class="ai-page__top-row">
          <div class="tmk-card ai-budget-card">
            <ai-usage-widget></ai-usage-widget>
          </div>

          <div class="ai-actions-grid">
            @for (action of actions; track action.id) {
              <div class="ai-action-card tmk-card">
                <div class="ai-action-card__icon" [style.background]="action.color">
                  <i class="bi {{ action.icon }}"></i>
                </div>
                <div class="ai-action-card__body">
                  <strong>{{ action.name }}</strong>
                  <span>{{ action.tier === 'sonnet' ? 'Claude Sonnet — متقدم' : 'Claude Haiku — سريع' }}</span>
                </div>
                <span class="ai-action-card__tier" [class.sonnet]="action.tier === 'sonnet'">
                  {{ action.tier === 'sonnet' ? 'متقدم' : 'سريع' }}
                </span>
              </div>
            }
          </div>
        </div>

        <!-- Analysis History -->
        <div class="tmk-card ai-history-card">
          <div class="ai-history-card__header">
            <h2><i class="bi bi-clock-history"></i> سجل التحليلات</h2>
            <span class="text-muted" style="font-size:0.8125rem">آخر التحليلات المنجزة</span>
          </div>
          <div class="ai-history-card__body">
            <ai-analysis-history
              [selectedId]="''"
              (viewAnalysis)="onViewAnalysis($event)">
            </ai-analysis-history>
          </div>
        </div>

        <!-- Selected Analysis Detail -->
        @if (selectedResult()) {
          <div class="tmk-card" style="margin-top:1.5rem">
            <div style="padding:1rem 1.25rem;border-bottom:1px solid var(--tmk-border-color);display:flex;align-items:center;justify-content:space-between">
              <h2 style="margin:0;font-size:1rem;font-weight:700">تفاصيل التحليل</h2>
              <button (click)="selectedResult.set(null)" style="background:none;border:none;cursor:pointer;color:#6C737F;font-size:1.25rem">
                <i class="bi bi-x-lg"></i>
              </button>
            </div>
            <ai-findings-display
              [result]="selectedResult()!"
              [actionId]="selectedResult()!.analysis_id"
              (applyCounterLanguage)="null"
              (reviewAction)="null">
            </ai-findings-display>
          </div>
        }

        <!-- How It Works -->
        <div class="tmk-card ai-how-card">
          <div class="ai-how-card__header">
            <h2><i class="bi bi-info-circle-fill"></i> كيف يعمل التحليل الذكي؟</h2>
          </div>
          <div class="ai-how-steps">
            <div class="ai-how-step">
              <div class="ai-how-step__num">١</div>
              <div>
                <strong>افتح قضية</strong>
                <p>انتقل إلى أي قضية من قائمة القضايا</p>
              </div>
            </div>
            <div class="ai-how-step__arrow"><i class="bi bi-arrow-left"></i></div>
            <div class="ai-how-step">
              <div class="ai-how-step__num">٢</div>
              <div>
                <strong>الخطوة الخامسة</strong>
                <p>انتقل إلى التبويب "التحليل الذكي" في تفاصيل القضية</p>
              </div>
            </div>
            <div class="ai-how-step__arrow"><i class="bi bi-arrow-left"></i></div>
            <div class="ai-how-step">
              <div class="ai-how-step__num">٣</div>
              <div>
                <strong>اختر التحليل</strong>
                <p>حدد نوع التحليل، اضبط المعاملات، وشغّل</p>
              </div>
            </div>
            <div class="ai-how-step__arrow"><i class="bi bi-arrow-left"></i></div>
            <div class="ai-how-step">
              <div class="ai-how-step__num">٤</div>
              <div>
                <strong>راجع النتائج</strong>
                <p>اطّلع على المخاطر والتوصيات ووافق على التحليل</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </app-dashboard-layout>
  `,
  styles: [`
    .ai-page {
      animation: tmk-fadeIn 0.3s ease-out;
    }
    .ai-page__top-row {
      display: grid;
      grid-template-columns: 300px 1fr;
      gap: 1.5rem;
      margin-bottom: 1.5rem;
    }
    .ai-budget-card { padding: 0; overflow: hidden; }

    .ai-actions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 0.75rem;
      align-content: start;
    }
    .ai-action-card {
      display: flex;
      align-items: center;
      gap: 0.875rem;
      padding: 0.875rem 1rem;
      transition: transform 0.15s ease;
      &:hover { transform: translateY(-1px); }
    }
    .ai-action-card__icon {
      width: 38px; height: 38px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      color: #fff; font-size: 1rem; flex-shrink: 0;
    }
    .ai-action-card__body {
      flex: 1; min-width: 0;
      strong { display: block; font-size: 0.8125rem; font-weight: 600; color: #111927; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      span { font-size: 0.7rem; color: #9DA4AE; }
    }
    .ai-action-card__tier {
      font-size: 0.65rem; font-weight: 700; padding: 0.2rem 0.45rem;
      border-radius: 5px; background: #ECFDF5; color: #059669; white-space: nowrap;
      &.sonnet { background: #EDE9FE; color: #7C3AED; }
    }

    .ai-history-card { margin-bottom: 1.5rem; }
    .ai-history-card__header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 1rem 1.25rem; border-bottom: 1px solid var(--tmk-border-color);
      h2 { margin: 0; font-size: 1rem; font-weight: 700; display: flex; align-items: center; gap: 0.5rem; }
      h2 i { color: #818CF8; }
    }
    .ai-history-card__body { padding: 0; }

    .ai-how-card { margin-top: 1.5rem; }
    .ai-how-card__header {
      padding: 1rem 1.25rem; border-bottom: 1px solid var(--tmk-border-color);
      h2 { margin: 0; font-size: 1rem; font-weight: 700; display: flex; align-items: center; gap: 0.5rem; }
      h2 i { color: #3B82F6; }
    }
    .ai-how-steps {
      display: flex; align-items: center; gap: 0; padding: 1.5rem 1.25rem;
      flex-wrap: wrap; gap: 0.5rem;
    }
    .ai-how-step {
      display: flex; align-items: flex-start; gap: 0.75rem;
      background: #F9FAFB; border-radius: 10px;
      padding: 1rem; flex: 1; min-width: 160px;
      strong { display: block; font-size: 0.875rem; font-weight: 700; margin-bottom: 0.25rem; }
      p { margin: 0; font-size: 0.75rem; color: #6C737F; line-height: 1.4; }
    }
    .ai-how-step__num {
      width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0;
      background: linear-gradient(135deg, #6366F1, #818CF8);
      color: #fff; font-size: 0.875rem; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
    }
    .ai-how-step__arrow {
      color: #D1D5DB; font-size: 1.25rem; padding: 0 0.25rem; flex-shrink: 0;
    }

    @media (max-width: 991px) {
      .ai-page__top-row { grid-template-columns: 1fr; }
      .ai-how-step__arrow { display: none; }
    }
  `]
})
export class AiComponent {
  aiService = inject(AIEngineService);
  selectedResult = this.aiService.lastResult;

  actions = [
    { id: 'contract_review',  name: 'مراجعة العقد',       icon: 'bi-file-earmark-text',   tier: 'sonnet', color: 'linear-gradient(135deg,#7C3AED,#A78BFA)' },
    { id: 'counter_analysis', name: 'تحليل الطرف الآخر',  icon: 'bi-arrow-left-right',     tier: 'sonnet', color: 'linear-gradient(135deg,#1D4ED8,#60A5FA)' },
    { id: 'demand_response',  name: 'رد على المطالبة',     icon: 'bi-envelope-paper',       tier: 'sonnet', color: 'linear-gradient(135deg,#065F46,#34D399)' },
    { id: 'risk_assessment',  name: 'تقييم المخاطر',      icon: 'bi-shield-exclamation',   tier: 'haiku',  color: 'linear-gradient(135deg,#B45309,#FBBF24)' },
    { id: 'provision_check',  name: 'فحص البنود',          icon: 'bi-list-check',           tier: 'haiku',  color: 'linear-gradient(135deg,#0E7490,#38BDF8)' },
    { id: 'clause_generate',  name: 'توليد بنود',          icon: 'bi-pencil-square',        tier: 'haiku',  color: 'linear-gradient(135deg,#6D28D9,#C084FC)' },
    { id: 'compliance_check', name: 'فحص الامتثال',       icon: 'bi-patch-check',          tier: 'sonnet', color: 'linear-gradient(135deg,#047857,#6EE7B7)' },
    { id: 'summary_generate', name: 'ملخص المستند',        icon: 'bi-card-text',            tier: 'haiku',  color: 'linear-gradient(135deg,#9D174D,#F472B6)' },
  ];

  onViewAnalysis(result: any) {
    this.selectedResult.set(result);
  }
}
