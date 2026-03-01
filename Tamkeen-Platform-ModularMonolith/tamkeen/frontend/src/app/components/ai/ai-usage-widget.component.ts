import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AIEngineService } from '../../core/services/ai-engine.service';

@Component({
  selector: 'ai-usage-widget',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="ai-usage" dir="rtl">
      <div class="ai-usage__header">
        <i class="bi bi-bar-chart-line"></i>
        <span>استخدام AI الشهري</span>
      </div>
      <div class="ai-usage__bar">
        <div class="ai-usage__bar-fill" [style.width.%]="budget().usage_percent"
             [class.warning]="budget().at_alert_threshold"
             [class.exceeded]="!budget().allowed">
        </div>
      </div>
      <div class="ai-usage__stats">
        <span>{{ budget().monthly_cost_sar | number:'1.0-2' }} ر.س / {{ budget().limit_usd * 3.75 | number:'1.0-0' }} ر.س</span>
        <span>{{ budget().monthly_calls }} طلب</span>
      </div>
    </div>
  `,
  styles: [`
    .ai-usage { padding: 0.85rem 1rem; background: #F9FAFB; border: 1px solid var(--tmk-border-color); border-radius: 10px; }
    .ai-usage__header { display: flex; align-items: center; gap: 0.4rem; font-size: 0.72rem; font-weight: 600; color: #384250; margin-bottom: 0.5rem; }
    .ai-usage__header i { color: var(--tmk-primary); font-size: 0.85rem; }
    .ai-usage__bar { height: 6px; background: #E5E7EB; border-radius: 3px; overflow: hidden; }
    .ai-usage__bar-fill { height: 100%; background: var(--tmk-primary); border-radius: 3px; transition: width 400ms; min-width: 2px; }
    .ai-usage__bar-fill.warning { background: #F59E0B; }
    .ai-usage__bar-fill.exceeded { background: #DC2626; }
    .ai-usage__stats { display: flex; justify-content: space-between; margin-top: 0.35rem; font-size: 0.68rem; color: #6C737F; }
  `]
})
export class AIUsageWidgetComponent {
  private aiService = inject(AIEngineService);
  budget = this.aiService.budget;
}
