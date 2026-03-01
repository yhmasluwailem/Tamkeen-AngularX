import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DashboardLayoutComponent } from '../../layouts/dashboard/dashboard-layout.component';
import { StoreService } from '../../core/services/store.service';
import { formatCurrency, formatRelativeDate } from '../../core/utils/formatters';
import { SAUDI_COURTS } from '../../core/data/classifications';

@Component({
  selector: 'app-client-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DashboardLayoutComponent],
  template: `
    <app-dashboard-layout>
      <div class="page" dir="rtl">
        @if (!client()) {
          <div class="not-found"><span>⚠️</span><h2>العميل غير موجود</h2><a routerLink="/clients" class="tmk-btn primary">العودة</a></div>
        } @else {
          <nav class="breadcrumb"><a routerLink="/clients">العملاء</a><span>›</span><span>{{ client()!.name }}</span></nav>

          <!-- HEADER -->
          <div class="client-header">
            <div class="ch-right">
              <div class="ch-avatar" [style.background]="client()!.type==='corporate' ? '#3b82f6' : '#1B8354'">{{ client()!.name.charAt(0) }}</div>
              <div>
                <h1>{{ client()!.name }}</h1>
                <div class="ch-meta">
                  <span class="type-badge" [class]="client()!.type">{{ client()!.type === 'corporate' ? 'منشأة تجارية' : 'فرد' }}</span>
                  <span>{{ client()!.id }}</span>
                  @if (client()!.city) { <span>📍 {{ client()!.city }}</span> }
                </div>
              </div>
            </div>
            <div class="ch-actions">
              <button class="tmk-btn whatsapp" (click)="openWhatsApp()">💬 واتساب</button>
              <button class="tmk-btn outline" (click)="callClient()">📞 اتصال</button>
            </div>
          </div>

          <!-- STATS -->
          <div class="stats-row">
            <div class="stat-card"><span class="sv">{{ clientCases().length }}</span><span class="sl">القضايا</span></div>
            <div class="stat-card"><span class="sv">{{ fmtCurrency(totalFees()) }}</span><span class="sl">إجمالي الأتعاب</span></div>
            <div class="stat-card"><span class="sv">{{ fmtCurrency(totalPaid()) }}</span><span class="sl">المسدد</span></div>
            <div class="stat-card" [class.danger]="totalBalance() > 0"><span class="sv">{{ fmtCurrency(totalBalance()) }}</span><span class="sl">المتبقي</span></div>
          </div>

          <div class="detail-grid">
            <!-- MAIN -->
            <div class="main-col">
              <!-- Client Info Card -->
              <div class="section-card">
                <h3>📋 البيانات الأساسية</h3>
                <div class="info-grid">
                  <div class="ig-row"><span>رقم الهوية/السجل</span><strong class="mono">{{ client()!.idNumber || '—' }}</strong></div>
                  <div class="ig-row"><span>نوع الهوية</span><strong>{{ getIdTypeLabel(client()!.idType) }}</strong></div>
                  <div class="ig-row"><span>رقم الجوال</span><strong class="mono" dir="ltr">{{ client()!.phone }}</strong></div>
                  <div class="ig-row"><span>البريد الإلكتروني</span><strong>{{ client()!.email || '—' }}</strong></div>
                  <div class="ig-row"><span>العنوان</span><strong>{{ client()!.address || '—' }}</strong></div>
                </div>
              </div>

              <!-- CASES TABLE - Linked -->
              <div class="section-card">
                <div class="section-top"><h3>⚖️ القضايا ({{ clientCases().length }})</h3></div>
                @if (clientCases().length > 0) {
                  <table class="tmk-table inner">
                    <thead><tr><th>القضية</th><th>المحكمة</th><th>الحالة</th><th>الأتعاب</th><th></th></tr></thead>
                    <tbody>
                      @for (c of clientCases(); track c.id) {
                        <tr>
                          <td><strong>{{ c.title }}</strong></td>
                          <td>{{ getCourtName(c.courtType) }}</td>
                          <td><span class="badge" [class]="'b-' + c.status">{{ getStatusLabel(c.status) }}</span></td>
                          <td>{{ fmtCurrency(c.agreedFee || 0) }}</td>
                          <td><a [routerLink]="['/cases', c.id]" class="view-link">عرض ←</a></td>
                        </tr>
                      }
                    </tbody>
                  </table>
                } @else {
                  <div class="empty-state"><span>⚖️</span><p>لا توجد قضايا</p></div>
                }
              </div>

              <!-- INVOICES TABLE - Linked -->
              <div class="section-card">
                <div class="section-top"><h3>💰 الفواتير ({{ clientInvoices().length }})</h3></div>
                @if (clientInvoices().length > 0) {
                  <table class="tmk-table inner">
                    <thead><tr><th>رقم الفاتورة</th><th>المبلغ</th><th>الحالة</th><th>تاريخ الاستحقاق</th></tr></thead>
                    <tbody>
                      @for (inv of clientInvoices(); track inv.id) {
                        <tr>
                          <td class="mono">{{ inv.invoiceNumber }}</td>
                          <td><strong>{{ fmtCurrency(inv.total || 0) }}</strong></td>
                          <td><span class="badge" [class]="'b-' + inv.status">{{ getInvStatusLabel(inv.status) }}</span></td>
                          <td>{{ inv.dueDate }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                } @else {
                  <div class="empty-state"><span>💰</span><p>لا توجد فواتير</p></div>
                }
              </div>
            </div>

            <!-- SIDEBAR -->
            <div class="sidebar-col">
              @if (client()!.notes) {
                <div class="sidebar-card"><h4>📝 ملاحظات</h4><p>{{ client()!.notes }}</p></div>
              }
              <div class="sidebar-card">
                <h4>📊 إحصائيات</h4>
                <div class="sc-row"><span>القضايا النشطة</span><strong>{{ activeCasesCount() }}</strong></div>
                <div class="sc-row"><span>عميل منذ</span><strong>{{ fmtRelative(client()!.createdAt) }}</strong></div>
              </div>
            </div>
          </div>
        }
      </div>
    </app-dashboard-layout>
  `,
  styles: [`
    .page { max-width: 1400px; margin: 0 auto; }
    .not-found { text-align: center; padding: 4rem; }
    .not-found span { font-size: 3rem; display: block; margin-bottom: 1rem; }
    .breadcrumb { display: flex; gap: 0.5rem; font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1.5rem; }
    .breadcrumb a { color: var(--tmk-primary, #1B8354); text-decoration: none; }
    .client-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem; }
    .ch-right { display: flex; gap: 1rem; align-items: center; }
    .ch-avatar { width: 4rem; height: 4rem; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 1.5rem; font-weight: 800; }
    .ch-right h1 { font-size: 1.75rem; font-weight: 800; margin: 0; }
    .ch-meta { display: flex; align-items: center; gap: 0.75rem; font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.3rem; }
    .type-badge { padding: 0.15rem 0.5rem; border-radius: 8px; font-size: 0.75rem; font-weight: 500; }
    .type-badge.individual { background: rgba(27,131,84,0.1); color: var(--tmk-primary, #1B8354); }
    .type-badge.corporate { background: rgba(59,130,246,0.1); color: #3b82f6; }
    .ch-actions { display: flex; gap: 0.5rem; }
    .stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 2rem; }
    .stat-card { background: var(--card-bg,#fff); padding: 1rem 1.25rem; border-radius: 10px; border: 1px solid rgba(0,0,0,0.06); text-align: center; }
    .stat-card.danger { border-color: rgba(239,68,68,0.2); background: rgba(239,68,68,0.02); }
    .sv { font-size: 1.5rem; font-weight: 800; display: block; }
    .sl { font-size: 0.8rem; color: var(--text-secondary); }
    .detail-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 2rem; }
    @media(max-width:1000px) { .detail-grid { grid-template-columns: 1fr; } }
    .main-col { display: flex; flex-direction: column; gap: 1.5rem; }
    .section-card { background: var(--card-bg,#fff); border-radius: 14px; border: 1px solid rgba(0,0,0,0.06); padding: 1.25rem; }
    .section-card h3 { font-size: 1rem; font-weight: 700; margin: 0 0 1rem; }
    .section-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
    .info-grid { display: grid; gap: 0.5rem; }
    .ig-row { display: flex; justify-content: space-between; padding: 0.5rem; background: rgba(0,0,0,0.02); border-radius: 6px; font-size: 0.9rem; }
    .ig-row span { color: var(--text-secondary); }
    .mono { font-family: monospace; }
    .tmk-table.inner { border: none; }
    .tmk-table { width: 100%; border-collapse: collapse; background: var(--card-bg,#fff); border-radius: 10px; overflow: hidden; border: 1px solid rgba(0,0,0,0.06); }
    .tmk-table th { padding: 0.65rem 0.85rem; text-align: right; font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); background: rgba(0,0,0,0.02); }
    .tmk-table td { padding: 0.65rem 0.85rem; border-bottom: 1px solid rgba(0,0,0,0.04); font-size: 0.9rem; }
    .badge { padding: 0.2rem 0.5rem; border-radius: 10px; font-size: 0.75rem; font-weight: 600; }
    .b-active,.b-paid { background: rgba(27,131,84,0.1); color: var(--tmk-primary, #1B8354); }
    .b-pending,.b-issued { background: rgba(245,158,11,0.1); color: #f59e0b; }
    .b-closed { background: rgba(107,114,128,0.1); color: #6b7280; }
    .b-overdue { background: rgba(239,68,68,0.1); color: #ef4444; }
    .view-link { color: var(--tmk-primary, #1B8354); text-decoration: none; font-size: 0.85rem; font-weight: 600; }
    .empty-state { text-align: center; padding: 2rem; }
    .empty-state span { font-size: 2rem; display: block; margin-bottom: 0.5rem; opacity: 0.4; }
    .empty-state p { color: var(--text-secondary); }
    .sidebar-col { display: flex; flex-direction: column; gap: 1.25rem; }
    .sidebar-card { background: var(--card-bg,#fff); border-radius: 14px; border: 1px solid rgba(0,0,0,0.06); padding: 1.25rem; }
    .sidebar-card h4 { font-size: 0.95rem; margin: 0 0 0.75rem; }
    .sidebar-card p { font-size: 0.9rem; color: var(--text-secondary); margin: 0; }
    .sc-row { display: flex; justify-content: space-between; padding: 0.4rem 0; border-bottom: 1px solid rgba(0,0,0,0.04); font-size: 0.85rem; }
    .sc-row span { color: var(--text-secondary); }
    .tmk-btn { padding: 0.55rem 1.25rem; border-radius: 8px; border: none; font-family: inherit; font-size: 0.85rem; font-weight: 600; cursor: pointer; }
    .tmk-btn.primary { background: var(--tmk-primary, #1B8354); color: white; }
    .tmk-btn.outline { background: transparent; border: 1px solid rgba(0,0,0,0.12); }
    .tmk-btn.whatsapp { background: #25D366; color: white; }
  `]
})
export class ClientDetailComponent {
  private route = inject(ActivatedRoute);
  store = inject(StoreService);

  client = computed(() => {
    const id = this.route.snapshot.paramMap.get('id');
    return id ? this.store.getClient(id) : undefined;
  });
  clientCases = computed(() => this.client() ? this.store.getClientCases(this.client()!.id) : []);
  clientInvoices = computed(() => this.client() ? this.store.getClientInvoices(this.client()!.id) : []);
  totalFees = computed(() => this.clientCases().reduce((a, c) => a + (c.agreedFee || 0), 0));
  totalPaid = computed(() => this.clientCases().reduce((a, c) => a + (c.paidAmount || 0), 0));
  totalBalance = computed(() => this.totalFees() - this.totalPaid());
  activeCasesCount = computed(() => this.clientCases().filter(c => c.status === 'active').length);

  fmtCurrency = formatCurrency;
  fmtRelative = formatRelativeDate;
  getCourtName(t: string) { return SAUDI_COURTS.find(c => c.id === t)?.name || '—'; }
  getStatusLabel(s: string) { return { active: 'نشطة', pending: 'معلقة', closed: 'مغلقة' }[s] || s; }
  getInvStatusLabel(s: string) { return { paid: 'مدفوعة', issued: 'صادرة', overdue: 'متأخرة', draft: 'مسودة' }[s] || s; }
  getIdTypeLabel(t: string) { return { national_id: 'هوية وطنية', iqama: 'إقامة', commercial_reg: 'سجل تجاري', passport: 'جواز سفر' }[t] || t; }

  openWhatsApp() {
    const c = this.client();
    if (!c) return;
    window.open(`https://wa.me/${c.phone.replace(/^0/, '966')}?text=${encodeURIComponent(`مرحباً ${c.name}،`)}`, '_blank');
  }
  callClient() { const c = this.client(); if (c) window.open(`tel:${c.phone}`, '_self'); }
}
