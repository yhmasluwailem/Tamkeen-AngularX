import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardLayoutComponent } from '../../layouts/dashboard/dashboard-layout.component';
import { StoreService } from '../../core/services/store.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, DashboardLayoutComponent],
  template: `
    <app-dashboard-layout>
      <div class="page" dir="rtl">
        <h1>⚙️ الإعدادات</h1>
        <div class="tabs">
          <button [class.active]="tab() === 'profile'" (click)="tab.set('profile')">الملف الشخصي</button>
          <button [class.active]="tab() === 'office'" (click)="tab.set('office')">بيانات المكتب</button>
          <button [class.active]="tab() === 'notifications'" (click)="tab.set('notifications')">الإشعارات</button>
          <button [class.active]="tab() === 'integrations'" (click)="tab.set('integrations')">التكاملات</button>
        </div>

        @if (tab() === 'profile') {
          <div class="section-card">
            <h3>👤 الملف الشخصي</h3>
            <div class="form-row">
              <div class="form-group"><label>الاسم الكامل</label><input [(ngModel)]="profile.name" class="tmk-input"></div>
              <div class="form-group"><label>البريد الإلكتروني</label><input [(ngModel)]="profile.email" class="tmk-input" dir="ltr"></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>رقم الجوال</label><input [(ngModel)]="profile.phone" class="tmk-input" dir="ltr"></div>
              <div class="form-group"><label>رقم الرخصة</label><input [(ngModel)]="profile.licenseNumber" class="tmk-input mono" dir="ltr"></div>
            </div>
            <div class="form-group"><label>التخصص القانوني</label><input [(ngModel)]="profile.specialization" class="tmk-input" placeholder="قضايا تجارية، عقارية..."></div>
            <button class="tmk-btn primary" (click)="save()">💾 حفظ التغييرات</button>
            @if (saved()) { <span class="save-msg">✅ تم الحفظ بنجاح</span> }
          </div>
        }

        @if (tab() === 'office') {
          <div class="section-card">
            <h3>🏢 بيانات المكتب</h3>
            <div class="form-group"><label>اسم المكتب</label><input [(ngModel)]="office.name" class="tmk-input"></div>
            <div class="form-row">
              <div class="form-group"><label>السجل التجاري</label><input [(ngModel)]="office.crNumber" class="tmk-input mono" dir="ltr"></div>
              <div class="form-group"><label>الرقم الضريبي (VAT)</label><input [(ngModel)]="office.vatNumber" class="tmk-input mono" dir="ltr"></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>المدينة</label><input [(ngModel)]="office.city" class="tmk-input"></div>
              <div class="form-group"><label>العنوان</label><input [(ngModel)]="office.address" class="tmk-input"></div>
            </div>
            <div class="zatca-box">
              <div class="zb-icon">🛡️</div>
              <div>
                <strong>توافق ZATCA</strong>
                <p>الفوترة الإلكترونية متوافقة مع هيئة الزكاة والضريبة والجمارك</p>
                <label class="toggle-label"><input type="checkbox" [(ngModel)]="office.zatcaEnabled"><span>تفعيل الفوترة الإلكترونية</span></label>
              </div>
            </div>
            <button class="tmk-btn primary" (click)="save()">💾 حفظ</button>
            @if (saved()) { <span class="save-msg">✅ تم الحفظ</span> }
          </div>
        }

        @if (tab() === 'notifications') {
          <div class="section-card">
            <h3>🔔 إعدادات الإشعارات</h3>
            @for (n of notifications; track n.key) {
              <div class="notif-row">
                <div><strong>{{ n.label }}</strong><small>{{ n.desc }}</small></div>
                <label class="switch"><input type="checkbox" [(ngModel)]="n.enabled"><span class="slider"></span></label>
              </div>
            }
            <button class="tmk-btn primary" (click)="save()">💾 حفظ</button>
          </div>
        }

        @if (tab() === 'integrations') {
          <div class="section-card">
            <h3>🔗 التكاملات</h3>
            <div class="int-grid">
              @for (item of integrations; track item.name) {
                <div class="int-card" [class.active]="item.connected">
                  <span class="int-icon">{{ item.icon }}</span>
                  <strong>{{ item.name }}</strong>
                  <small>{{ item.desc }}</small>
                  <span class="int-status" [class.connected]="item.connected">{{ item.connected ? '✅ متصل' : '⚪ غير متصل' }}</span>
                </div>
              }
            </div>
          </div>
        }
      </div>
    </app-dashboard-layout>
  `,
  styles: [`
    .page { max-width: 900px; margin: 0 auto; }
    h1 { font-size: 1.75rem; font-weight: 800; margin-bottom: 1.5rem; }
    .tabs { display: flex; border-bottom: 2px solid rgba(0,0,0,0.06); margin-bottom: 2rem; }
    .tabs button { padding: 0.75rem 1.5rem; border: none; border-bottom: 2px solid transparent; margin-bottom: -2px; background: transparent; font-family: inherit; font-size: 0.9rem; cursor: pointer; color: var(--text-secondary); }
    .tabs button.active { color: #3b82f6; border-bottom-color: var(--tmk-primary, #1B8354); font-weight: 600; }
    .section-card { background: var(--card-bg,#fff); border-radius: 14px; border: 1px solid rgba(0,0,0,0.06); padding: 1.5rem; }
    .section-card h3 { font-size: 1.1rem; font-weight: 700; margin: 0 0 1.25rem; }
    .form-group { margin-bottom: 1rem; }
    .form-group label { display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.35rem; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .mono { font-family: monospace; }
    .tmk-input { width: 100%; padding: 0.6rem 0.8rem; border: 1px solid rgba(0,0,0,0.15); border-radius: 8px; font-family: inherit; font-size: 0.9rem; box-sizing: border-box; background: var(--card-bg,#fff); }
    .tmk-input:focus { outline: none; border-color: var(--tmk-primary, #1B8354); }
    .tmk-btn { padding: 0.6rem 1.5rem; border-radius: 8px; border: none; font-family: inherit; font-size: 0.9rem; font-weight: 600; cursor: pointer; margin-top: 0.5rem; }
    .tmk-btn.primary { background: var(--tmk-primary, #1B8354); color: white; }
    .save-msg { color: #10b981; font-size: 0.85rem; margin-right: 0.75rem; }
    .zatca-box { display: flex; gap: 1rem; background: rgba(16,185,129,0.04); border: 1px solid rgba(16,185,129,0.15); border-radius: 12px; padding: 1.25rem; margin: 1rem 0; }
    .zb-icon { font-size: 2rem; }
    .zatca-box strong { display: block; font-size: 0.95rem; }
    .zatca-box p { font-size: 0.85rem; color: var(--text-secondary); margin: 0.25rem 0 0.5rem; }
    .toggle-label { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; cursor: pointer; }
    .notif-row { display: flex; justify-content: space-between; align-items: center; padding: 1rem 0; border-bottom: 1px solid rgba(0,0,0,0.04); }
    .notif-row strong { display: block; font-size: 0.9rem; }
    .notif-row small { font-size: 0.8rem; color: var(--text-secondary); display: block; }
    .switch { position: relative; display: inline-block; width: 44px; height: 24px; flex-shrink: 0; }
    .switch input { opacity: 0; width: 0; height: 0; }
    .slider { position: absolute; cursor: pointer; inset: 0; background: #d1d5db; transition: 0.3s; border-radius: 24px; }
    .slider:before { content: ""; position: absolute; height: 18px; width: 18px; right: 3px; bottom: 3px; background: white; transition: 0.3s; border-radius: 50%; }
    .switch input:checked + .slider { background: #3b82f6; }
    .switch input:checked + .slider:before { transform: translateX(-20px); }
    .int-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; }
    .int-card { background: rgba(0,0,0,0.02); border: 1px solid rgba(0,0,0,0.06); border-radius: 12px; padding: 1.25rem; text-align: center; transition: all 0.2s; }
    .int-card.active { border-color: rgba(16,185,129,0.3); background: rgba(16,185,129,0.02); }
    .int-icon { font-size: 2rem; display: block; margin-bottom: 0.5rem; }
    .int-card strong { display: block; font-size: 0.9rem; margin-bottom: 0.25rem; }
    .int-card small { font-size: 0.8rem; color: var(--text-secondary); display: block; margin-bottom: 0.5rem; }
    .int-status { font-size: 0.75rem; }
    .int-status.connected { color: #10b981; }
  `]
})
export class SettingsComponent {
  store = inject(StoreService);
  tab = signal<string>('profile');
  saved = signal(false);

  profile = { name: 'المحامي أحمد', email: 'ahmed@tamkeen.sa', phone: '0501234567', licenseNumber: '', specialization: '' };
  office = { name: 'مكتب تمكين للمحاماة', crNumber: '', vatNumber: '', city: 'الرياض', address: '', zatcaEnabled: true };

  notifications = [
    { key: 'sessions', label: 'تذكير الجلسات', desc: 'إشعار قبل موعد الجلسة بـ 24 ساعة', enabled: true },
    { key: 'tasks', label: 'المهام المستحقة', desc: 'إشعار عند اقتراب موعد تسليم المهام', enabled: true },
    { key: 'invoices', label: 'الفواتير المتأخرة', desc: 'إشعار عند تأخر سداد فاتورة', enabled: true },
    { key: 'deadlines', label: 'المواعيد النهائية', desc: 'إشعار انتهاء الوكالات ومدد الاستئناف', enabled: true },
    { key: 'leads', label: 'العملاء المحتملين', desc: 'إشعار عند ورود طلب استشارة جديد', enabled: false },
  ];

  integrations = [
    { name: 'ناجز', icon: '⚖️', desc: 'ربط مع بوابة ناجز', connected: true },
    { name: 'واتساب API', icon: '💬', desc: 'إرسال إشعارات واتساب', connected: false },
    { name: 'ZATCA', icon: '🛡️', desc: 'الفوترة الإلكترونية', connected: true },
    { name: 'Google Calendar', icon: '📅', desc: 'مزامنة التقويم', connected: false },
    { name: 'Absher', icon: '🏛️', desc: 'التحقق من الهوية', connected: false },
    { name: 'SMS Gateway', icon: '📱', desc: 'إرسال رسائل نصية', connected: false },
  ];

  save() { this.saved.set(true); setTimeout(() => this.saved.set(false), 2000); }
}
