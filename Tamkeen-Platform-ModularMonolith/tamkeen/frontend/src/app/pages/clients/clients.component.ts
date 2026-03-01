import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DashboardLayoutComponent } from '../../layouts/dashboard/dashboard-layout.component';
import { StoreService } from '../../core/services/store.service';
import { formatCurrency } from '../../core/utils/formatters';

@Component({
  selector: 'app-clients',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DashboardLayoutComponent],
  template: `
    <app-dashboard-layout>
      <div class="page" dir="rtl">
        <div class="page-header">
          <div><h1>👥 إدارة العملاء</h1><p>قاعدة بيانات العملاء وجهات الاتصال</p></div>
          <button class="tmk-btn primary" (click)="showAdd.set(true)">➕ عميل جديد</button>
        </div>

        <!-- Stats -->
        <div class="stats-row">
          <div class="stat-card"><span class="sv">{{ store.clients().length }}</span><span class="sl">إجمالي العملاء</span></div>
          <div class="stat-card"><span class="sv">{{ individualCount() }}</span><span class="sl">أفراد</span></div>
          <div class="stat-card"><span class="sv">{{ corporateCount() }}</span><span class="sl">شركات</span></div>
          <div class="stat-card"><span class="sv">{{ fmtCurrency(totalBalance()) }}</span><span class="sl">أرصدة مستحقة</span></div>
        </div>

        <!-- Search -->
        <div class="search-bar">
          <input class="tmk-input" [(ngModel)]="search" placeholder="🔍 بحث بالاسم، الهاتف، أو البريد...">
        </div>

        <!-- Table -->
        <div class="table-wrap">
          <table class="tmk-table">
            <thead><tr><th>العميل</th><th>النوع</th><th>التواصل</th><th>القضايا النشطة</th><th>الرصيد المستحق</th><th></th></tr></thead>
            <tbody>
              @for (client of filtered(); track client.id) {
                <tr>
                  <td>
                    <a [routerLink]="['/clients', client.id]" class="client-cell">
                      <div class="avatar" [style.background]="client.type === 'corporate' ? '#3b82f6' : '#1B8354'">{{ client.name.charAt(0) }}</div>
                      <div><strong>{{ client.name }}</strong><small>{{ client.id }}</small></div>
                    </a>
                  </td>
                  <td><span class="type-badge" [class]="client.type">{{ client.type === 'corporate' ? 'منشأة' : 'فرد' }}</span></td>
                  <td>
                    <div class="contact-btns">
                      <button class="cb whatsapp" (click)="openWhatsApp(client); $event.stopPropagation()" title="واتساب">💬</button>
                      <button class="cb" (click)="callClient(client); $event.stopPropagation()" title="اتصال">📞</button>
                      @if (client.email) { <a [href]="'mailto:' + client.email" class="cb" title="بريد">📧</a> }
                    </div>
                  </td>
                  <td><strong class="cases-count">{{ getClientCasesCount(client.id) }}</strong> <small>قضايا</small></td>
                  <td>
                    @if (getClientBalance(client.id) > 0) {
                      <strong class="text-red">{{ fmtCurrency(getClientBalance(client.id)) }}</strong>
                    } @else {
                      <span class="text-green">لا يوجد</span>
                    }
                  </td>
                  <td><a [routerLink]="['/clients', client.id]" class="view-link">عرض ←</a></td>
                </tr>
              } @empty { <tr><td colspan="6" class="empty">لا يوجد عملاء مطابقين</td></tr> }
            </tbody>
          </table>
        </div>

        <!-- ADD CLIENT DIALOG -->
        @if (showAdd()) {
          <div class="tmk-overlay" (click)="showAdd.set(false)">
            <div class="tmk-modal" (click)="$event.stopPropagation()">
              <div class="modal-header"><h3>👤 عميل جديد</h3><button (click)="showAdd.set(false)">✕</button></div>
              <div class="modal-body">
                <div class="form-group"><label>الاسم الكامل <span class="req">*</span></label><input [(ngModel)]="f.name" class="tmk-input" placeholder="اسم العميل"></div>
                <div class="form-row">
                  <div class="form-group"><label>النوع</label>
                    <select [(ngModel)]="f.type" class="tmk-select"><option value="individual">فرد</option><option value="corporate">شركة / مؤسسة</option></select>
                  </div>
                  <div class="form-group"><label>نوع الهوية</label>
                    <select [(ngModel)]="f.idType" class="tmk-select"><option value="national_id">هوية وطنية</option><option value="iqama">إقامة</option><option value="commercial_reg">سجل تجاري</option><option value="passport">جواز سفر</option></select>
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group"><label>رقم الهوية/السجل</label><input [(ngModel)]="f.idNumber" class="tmk-input mono" dir="ltr"></div>
                  <div class="form-group"><label>رقم الجوال <span class="req">*</span></label><input [(ngModel)]="f.phone" class="tmk-input" dir="ltr" placeholder="05xxxxxxxx"></div>
                </div>
                <div class="form-row">
                  <div class="form-group"><label>البريد الإلكتروني</label><input [(ngModel)]="f.email" class="tmk-input" dir="ltr"></div>
                  <div class="form-group"><label>المدينة</label><input [(ngModel)]="f.city" class="tmk-input" placeholder="الرياض"></div>
                </div>
                <div class="form-group"><label>العنوان</label><input [(ngModel)]="f.address" class="tmk-input" placeholder="الحي، الشارع..."></div>
                <div class="form-group"><label>ملاحظات</label><textarea [(ngModel)]="f.notes" class="tmk-textarea" rows="2"></textarea></div>
              </div>
              <div class="modal-footer">
                <button class="tmk-btn outline" (click)="showAdd.set(false)">إلغاء</button>
                <button class="tmk-btn primary" (click)="submit()" [disabled]="!f.name || !f.phone">حفظ العميل</button>
              </div>
            </div>
          </div>
        }
      </div>
    </app-dashboard-layout>
  `,
  styles: [`
    .page { max-width: 1400px; margin: 0 auto; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
    .page-header h1 { font-size: 1.75rem; font-weight: 800; margin: 0; }
    .page-header p { color: var(--text-secondary); margin: 0.25rem 0 0; font-size: 0.9rem; }
    .stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 1.5rem; }
    .stat-card { background: var(--card-bg,#fff); padding: 1rem 1.25rem; border-radius: 10px; border: 1px solid rgba(0,0,0,0.06); text-align: center; }
    .sv { font-size: 1.5rem; font-weight: 800; display: block; }
    .sl { font-size: 0.8rem; color: var(--text-secondary); }
    .search-bar { margin-bottom: 1.5rem; }
    .search-bar .tmk-input { max-width: 400px; }
    .table-wrap { overflow-x: auto; }
    .tmk-table { width: 100%; border-collapse: collapse; background: var(--card-bg,#fff); border-radius: 12px; overflow: hidden; border: 1px solid rgba(0,0,0,0.06); }
    .tmk-table th { padding: 0.75rem 1rem; text-align: right; font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); background: rgba(0,0,0,0.02); }
    .tmk-table td { padding: 0.75rem 1rem; border-bottom: 1px solid rgba(0,0,0,0.04); font-size: 0.9rem; }
    .client-cell { display: flex; align-items: center; gap: 0.75rem; text-decoration: none; color: inherit; }
    .client-cell:hover strong { color: var(--tmk-primary, #1B8354); }
    .avatar { width: 2.25rem; height: 2.25rem; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 0.9rem; flex-shrink: 0; }
    .client-cell strong { display: block; font-size: 0.9rem; transition: color 0.2s; }
    .client-cell small { font-size: 0.75rem; color: var(--text-secondary); font-family: monospace; }
    .type-badge { padding: 0.2rem 0.6rem; border-radius: 12px; font-size: 0.75rem; font-weight: 500; }
    .type-badge.individual { background: rgba(27,131,84,0.1); color: var(--tmk-primary, #1B8354); }
    .type-badge.corporate { background: rgba(59,130,246,0.1); color: var(--tmk-primary, #1B8354); }
    .contact-btns { display: flex; gap: 0.4rem; }
    .cb { width: 2rem; height: 2rem; border-radius: 6px; border: 1px solid rgba(0,0,0,0.06); background: transparent; cursor: pointer; display: flex; align-items: center; justify-content: center; text-decoration: none; font-size: 0.9rem; transition: all 0.2s; }
    .cb:hover { background: rgba(0,0,0,0.04); }
    .cb.whatsapp:hover { background: rgba(37,211,102,0.1); }
    .cases-count { font-size: 1.1rem; color: var(--text-primary); }
    .text-red { color: #ef4444; }
    .text-green { color: var(--tmk-primary, #1B8354); font-size: 0.85rem; }
    .view-link { color: var(--tmk-primary, #1B8354); text-decoration: none; font-size: 0.85rem; font-weight: 600; }
    .empty { text-align: center; padding: 2rem !important; color: var(--text-secondary); }
    .tmk-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); z-index: 2000; display: flex; align-items: center; justify-content: center; }
    .tmk-modal { background: var(--card-bg,#fff); border-radius: 16px; width: 90%; max-width: 600px; max-height: 90vh; overflow-y: auto; }
    .modal-header { display: flex; justify-content: space-between; padding: 1.25rem 1.5rem; border-bottom: 1px solid rgba(0,0,0,0.08); }
    .modal-header h3 { font-size: 1.1rem; font-weight: 700; margin: 0; }
    .modal-header button { background: none; border: none; font-size: 1.25rem; cursor: pointer; }
    .modal-body { padding: 1.5rem; }
    .modal-footer { display: flex; justify-content: flex-end; gap: 0.75rem; padding: 1rem 1.5rem; border-top: 1px solid rgba(0,0,0,0.08); }
    .form-group { margin-bottom: 1rem; }
    .form-group label { display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.35rem; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .req { color: #ef4444; }
    .mono { font-family: monospace; }
    .tmk-input,.tmk-select,.tmk-textarea { width: 100%; padding: 0.6rem 0.8rem; border: 1px solid rgba(0,0,0,0.15); border-radius: 8px; font-family: inherit; font-size: 0.9rem; box-sizing: border-box; background: var(--card-bg,#fff); }
    .tmk-input:focus,.tmk-select:focus { outline: none; border-color: var(--tmk-primary, #1B8354); }
    .tmk-btn { padding: 0.55rem 1.25rem; border-radius: 8px; border: none; font-family: inherit; font-size: 0.85rem; font-weight: 600; cursor: pointer; }
    .tmk-btn.primary { background: var(--tmk-primary, #1B8354); color: white; }
    .tmk-btn.primary:disabled { opacity: 0.5; }
    .tmk-btn.outline { background: transparent; border: 1px solid rgba(0,0,0,0.12); }
  `]
})
export class ClientsComponent {
  store = inject(StoreService);
  search = '';
  showAdd = signal(false);
  f = { name: '', type: 'individual' as string, idType: 'national_id' as string, idNumber: '', phone: '', email: '', city: '', address: '', notes: '' };

  individualCount = computed(() => this.store.clients().filter(c => c.type === 'individual').length);
  corporateCount = computed(() => this.store.clients().filter(c => c.type === 'corporate').length);
  totalBalance = computed(() => this.store.clients().reduce((acc, c) => acc + this.getClientBalance(c.id), 0));

  filtered = computed(() => {
    if (!this.search) return this.store.clients();
    const q = this.search.toLowerCase();
    return this.store.clients().filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(q) || (c.email || '').toLowerCase().includes(q));
  });

  fmtCurrency = formatCurrency;
  getClientCasesCount(id: string) { return this.store.getClientCases(id).length; }
  getClientBalance(id: string) {
    return this.store.getClientInvoices(id)
      .filter(i => i.status === 'issued' || i.status === 'overdue')
      .reduce((acc, i) => acc + ((i.total || 0) - (i.paidAmount || 0)), 0);
  }

  openWhatsApp(client: any) {
    const phone = client.phone.replace(/^0/, '966');
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(`مرحباً ${client.name}،`)}`, '_blank');
  }
  callClient(client: any) { window.open(`tel:${client.phone}`, '_self'); }

  submit() {
    if (!this.f.name || !this.f.phone) return;
    this.store.addClient({
      id: this.store.generateId('CL'), name: this.f.name, type: this.f.type as any,
      idType: this.f.idType as any, idNumber: this.f.idNumber, phone: this.f.phone,
      email: this.f.email, city: this.f.city, address: this.f.address, notes: this.f.notes,
      whatsappOptIn: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    } as any);
    this.showAdd.set(false);
    this.f = { name: '', type: 'individual', idType: 'national_id', idNumber: '', phone: '', email: '', city: '', address: '', notes: '' };
  }
}
