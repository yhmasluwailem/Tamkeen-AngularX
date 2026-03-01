import { Component, Input, Output, EventEmitter, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AIEngineService } from '../../core/services/ai-engine.service';
import { AIAnalysis, AIActionId, AnalysisStatus } from '../../core/models/ai';

@Component({
  selector: 'ai-analysis-history',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="ai-history" dir="rtl">
      <div class="ai-history__header">
        <h4>
          <i class="bi bi-clock-history"></i>
          التحليلات السابقة
        </h4>
        @if (analyses().length) {
          <span class="history-count">{{ analyses().length }}</span>
        }
      </div>
      @if (!analyses().length) {
        <div class="ai-history__empty">
          <i class="bi bi-cpu"></i>
          <p>لا توجد تحليلات سابقة لهذه القضية</p>
        </div>
      } @else {
        <div class="ai-history__list">
          @for (a of analyses(); track a.id) {
            <div class="history-item" (click)="viewAnalysis.emit(a)" [class.active]="selectedId === a.id">
              <div class="history-item__icon" [class]="'action-' + a.action_id">
                <i class="bi" [class]="getIcon(a.action_id)"></i>
              </div>
              <div class="history-item__info">
                <strong>{{ getActionLabel(a.action_id) }}</strong>
                <span class="history-item__meta">
                  {{ formatDate(a.created_at) }}
                  <span class="dot">·</span>
                  {{ a.cost_sar | number:'1.2-2' }} ر.س
                </span>
              </div>
              <div class="history-item__right">
                @if (a.risk_score !== null) {
                  <span class="mini-score" [class]="scoreClass(a.risk_score)">{{ a.risk_score }}</span>
                }
                <span class="status-dot" [class]="'st-' + a.status" [title]="statusLabel(a.status)"></span>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .ai-history { background: var(--tmk-card-bg); border: 1px solid var(--tmk-border-color); border-radius: var(--tmk-border-radius); overflow: hidden; box-shadow: var(--tmk-shadow-card); }
    .ai-history__header { display: flex; align-items: center; justify-content: space-between; padding: 0.85rem 1rem; border-bottom: 1px solid var(--tmk-border-color); }
    .ai-history__header h4 { margin: 0; font-size: 0.82rem; display: flex; align-items: center; gap: 0.4rem; }
    .ai-history__header h4 i { color: var(--tmk-primary); }
    .history-count { font-size: 0.65rem; padding: 0.1rem 0.5rem; border-radius: 10px; background: var(--tmk-primary); color: white; font-weight: 600; }

    .ai-history__empty { padding: 2rem 1rem; text-align: center; }
    .ai-history__empty i { font-size: 2rem; color: #D1D5DB; display: block; margin-bottom: 0.5rem; }
    .ai-history__empty p { margin: 0; font-size: 0.78rem; color: #9DA4AE; }

    .ai-history__list { max-height: 300px; overflow-y: auto; }
    .history-item {
      display: flex; align-items: center; gap: 0.65rem; padding: 0.7rem 1rem;
      border-bottom: 1px solid #F3F4F6; cursor: pointer; transition: background 150ms;
    }
    .history-item:hover { background: #F9FAFB; }
    .history-item.active { background: var(--tmk-primary-light); }
    .history-item:last-child { border-bottom: none; }

    .history-item__icon { width: 30px; height: 30px; border-radius: 7px; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; flex-shrink: 0; }
    .action-contract_review, .action-compliance_check { background: #EDE9FE; color: #7C3AED; }
    .action-risk_assessment { background: #FFF7ED; color: #EA580C; }
    .action-counter_analysis { background: #DBEAFE; color: #2563EB; }
    .action-demand_response, .action-clause_generate { background: #ECFDF5; color: #059669; }
    .action-summary_generate, .action-provision_check { background: #F3F4F6; color: #6C737F; }

    .history-item__info { flex: 1; min-width: 0; }
    .history-item__info strong { display: block; font-size: 0.78rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .history-item__meta { font-size: 0.65rem; color: #9DA4AE; }
    .dot { margin: 0 0.2rem; }

    .history-item__right { display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0; }
    .mini-score { width: 24px; height: 24px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 800; }
    .mini-score.score-low { background: #ECFDF5; color: #059669; }
    .mini-score.score-medium { background: #FFFBEB; color: #D97706; }
    .mini-score.score-high { background: #FFF7ED; color: #EA580C; }
    .mini-score.score-critical { background: #FEF2F2; color: #DC2626; }

    .status-dot { width: 8px; height: 8px; border-radius: 50%; }
    .st-completed { background: #F59E0B; }
    .st-reviewed { background: #059669; }
    .st-rejected { background: #DC2626; }
    .st-applied { background: #7C3AED; }
    .st-pending { background: #D1D5DB; }
  `]
})
export class AIAnalysisHistoryComponent {
  @Input() selectedId = '';
  @Output() viewAnalysis = new EventEmitter<AIAnalysis>();

  private aiService = inject(AIEngineService);
  analyses = this.aiService.analyses;

  getIcon(actionId: string): string {
    const icons: Record<string, string> = {
      contract_review: 'bi-file-earmark-text', counter_analysis: 'bi-arrow-left-right',
      demand_response: 'bi-envelope-paper', risk_assessment: 'bi-shield-exclamation',
      provision_check: 'bi-list-check', clause_generate: 'bi-pencil-square',
      compliance_check: 'bi-patch-check', summary_generate: 'bi-card-text',
    };
    return icons[actionId] || 'bi-cpu';
  }

  getActionLabel(actionId: string): string {
    const labels: Record<string, string> = {
      contract_review: 'مراجعة العقد', counter_analysis: 'تحليل الموقف المقابل',
      demand_response: 'تحليل خطاب المطالبة', risk_assessment: 'تقييم المخاطر',
      provision_check: 'فحص البنود المفقودة', clause_generate: 'توليد صياغة بديلة',
      compliance_check: 'فحص الامتثال', summary_generate: 'إنشاء ملخص',
    };
    return labels[actionId] || actionId;
  }

  statusLabel(status: string): string {
    return { pending: 'قيد التحليل', completed: 'بانتظار المراجعة', reviewed: 'تمت الموافقة', rejected: 'مرفوض', applied: 'تم التطبيق' }[status] || status;
  }

  scoreClass(score: number | null): string {
    if (!score) return '';
    if (score >= 8) return 'score-critical';
    if (score >= 6) return 'score-high';
    if (score >= 4) return 'score-medium';
    return 'score-low';
  }

  formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString('ar-SA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
}
