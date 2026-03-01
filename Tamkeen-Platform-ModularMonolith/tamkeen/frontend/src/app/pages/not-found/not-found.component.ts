import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DashboardLayoutComponent } from '../../layouts/dashboard/dashboard-layout.component';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink, DashboardLayoutComponent],
  template: `
    <app-dashboard-layout>
      <div class="nf" dir="rtl">
        <span class="nf-code">404</span>
        <h1>الصفحة غير موجودة</h1>
        <p>الصفحة التي تبحث عنها غير موجودة أو تم نقلها</p>
        <a routerLink="/" class="tmk-btn primary">🏠 العودة للرئيسية</a>
      </div>
    </app-dashboard-layout>
  `,
  styles: [`
    .nf { text-align: center; padding: 5rem 2rem; }
    .nf-code { font-size: 6rem; font-weight: 900; color: rgba(0,0,0,0.08); display: block; line-height: 1; }
    .nf h1 { font-size: 1.5rem; font-weight: 700; margin: 1rem 0 0.5rem; }
    .nf p { color: var(--text-secondary); margin-bottom: 2rem; }
    .tmk-btn { padding: 0.65rem 1.5rem; border-radius: 8px; border: none; font-family: inherit; font-size: 0.9rem; font-weight: 600; cursor: pointer; text-decoration: none; display: inline-block; }
    .tmk-btn.primary { background: #3b82f6; color: white; }
  `]
})
export class NotFoundComponent {}
