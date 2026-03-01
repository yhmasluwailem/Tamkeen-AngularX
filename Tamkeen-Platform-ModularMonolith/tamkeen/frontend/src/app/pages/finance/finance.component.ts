import { Component, inject, computed, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DashboardLayoutComponent } from '../../layouts/dashboard/dashboard-layout.component';
import { StoreService } from '../../core/services/store.service';
import { formatCurrency } from '../../core/utils/formatters';

const VAT_RATE = 15;

@Component({
  selector: 'app-finance',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DashboardLayoutComponent],
  template: `
    <app-dashboard-layout>
      <div class="page" dir="rtl">
        <nav class="dga-breadcrumb">
          <a routerLink="/home">إستعراض</a>
          <span class="sep">‹</span>
          <span>الإدارة المالية</span>
        </nav>
        <div class="page-header">
          <div>
            <h1>الإدارة المالية</h1>
            <p>الفواتير والمصروفات والتقارير المالية</p>
          </div>
          <button class="tmk-btn primary" (click)="showInvoice.set(true)">
            <i class="bi bi-receipt"></i> فاتورة جديدة
          </button>
        </div>

        <!-- FINANCIAL OVERVIEW CARDS -->
        <div class="fin-overview">
          @for (card of finCards(); track card.label) {
            <div class="fin-card" [style.border-top-color]="card.color">
              <span class="fc-icon" [style.background]="card.bg">{{ card.icon }}</span>
              <div class="fc-info">
                <small>{{ card.label }}</small>
                <strong [style.color]="card.color">{{ card.value }}</strong>
              </div>
            </div>
          }
        </div>

        <!-- TABS -->
        <div class="tabs">
          <button [class.active]="tab() === 'invoices'" (click)="tab.set('invoices')">الفواتير ({{ store.invoices().length }})</button>
          <button [class.active]="tab() === 'expenses'" (click)="tab.set('expenses')">المصروفات ({{ store.expenses().length }})</button>
          <button [class.active]="tab() === 'overview'" (click)="tab.set('overview')">ملخص مالي</button>
        </div>

        <!-- TAB: INVOICES -->
        @if (tab() === 'invoices') {
          <div class="filters">
            <input class="tmk-input search" [ngModel]="invoiceSearch()" (ngModelChange)="invoiceSearch.set($event)" placeholder="🔍 بحث برقم الفاتورة أو اسم العميل...">
            <select class="tmk-select" [ngModel]="invoiceStatusFilter()" (ngModelChange)="invoiceStatusFilter.set($event)">
              <option value="">كل الحالات</option>
              <option value="draft">مسودة</option>
              <option value="issued">صادرة</option>
              <option value="paid">مدفوعة</option>
              <option value="overdue">متأخرة</option>
            </select>
          </div>
          <div class="table-wrap">
            <table class="tmk-table">
              <thead><tr>
                <th>رقم الفاتورة</th><th>العميل</th><th>القضية</th><th>المبلغ</th><th>المسدد</th><th>الحالة</th><th>ZATCA</th><th>تاريخ الاستحقاق</th><th></th>
              </tr></thead>
              <tbody>
                @for (inv of filteredInvoices(); track inv.id) {
                  <tr>
                    <td class="mono">{{ inv.invoiceNumber }}</td>
                    <td><a [routerLink]="['/clients', inv.clientId]" class="link">{{ store.clientName(inv.clientId) }}</a></td>
                    <td>
                      @if (inv.caseId) {
                        <a [routerLink]="['/cases', inv.caseId]" class="link">{{ getCaseTitle(inv.caseId) }}</a>
                      } @else { <span class="muted">—</span> }
                    </td>
                    <td><strong>{{ fmtCurrency(inv.total || 0) }}</strong></td>
                    <td>{{ fmtCurrency(inv.paidAmount || 0) }}</td>
                    <td><span class="badge" [class]="'b-' + inv.status">{{ getInvStatusLabel(inv.status) }}</span></td>
                    <td>
                      <span class="zatca-badge" [class.compliant]="inv.zatcaCompliant !== false">
                        🛡️ {{ inv.zatcaCompliant !== false ? 'متوافق' : 'غير متوافق' }}
                      </span>
                    </td>
                    <td [class.text-red]="isOverdue(inv.dueDate)">{{ inv.dueDate }}</td>
                    <td>
                      <div class="action-btns">
                        <button class="tmk-btn sm outline" (click)="editInvoice(inv)">✏️ تعديل</button>
                        @if (inv.status !== 'paid') {
                          <button class="tmk-btn sm primary" (click)="markAsPaid(inv.id)">✓ تسديد</button>
                        }
                      </div>
                    </td>
                  </tr>
                } @empty { <tr><td colspan="9" class="empty">لا توجد فواتير</td></tr> }
              </tbody>
            </table>
          </div>
        }

        <!-- TAB: EXPENSES -->
        @if (tab() === 'expenses') {
          <div class="section-top">
            <span></span>
            <button class="tmk-btn outline" (click)="showExpense.set(true)">➕ مصروف جديد</button>
          </div>
          <div class="table-wrap">
            <table class="tmk-table">
              <thead><tr><th>الوصف</th><th>الفئة</th><th>المبلغ</th><th>التاريخ</th></tr></thead>
              <tbody>
                @for (exp of store.expenses(); track exp.id) {
                  <tr>
                    <td>{{ exp.description }}</td>
                    <td><span class="cat-badge">{{ exp.category }}</span></td>
                    <td><strong>{{ fmtCurrency(exp.amount) }}</strong></td>
                    <td>{{ exp.date }}</td>
                  </tr>
                } @empty { <tr><td colspan="4" class="empty">لا توجد مصروفات</td></tr> }
              </tbody>
            </table>
          </div>
        }

        <!-- TAB: OVERVIEW -->
        @if (tab() === 'overview') {
          <div class="overview-grid">
            <div class="ov-card">
              <h3>📊 ملخص الإيرادات</h3>
              <div class="ov-row main"><span>إجمالي الفواتير المصدرة</span><strong>{{ fmtCurrency(totalIssued()) }}</strong></div>
              <div class="ov-row"><span>المحصّل</span><strong class="text-green">{{ fmtCurrency(totalPaid()) }}</strong></div>
              <div class="ov-row"><span>قيد الانتظار</span><strong class="text-orange">{{ fmtCurrency(totalPending()) }}</strong></div>
              <div class="ov-row"><span>متأخر السداد</span><strong class="text-red">{{ fmtCurrency(totalOverdue()) }}</strong></div>
              <div class="ov-divider"></div>
              <div class="ov-row"><span>ضريبة محصّلة (VAT 15%)</span><strong>{{ fmtCurrency(totalVat()) }}</strong></div>
              <div class="ov-row main"><span>نسبة التحصيل</span><strong>{{ collectionRate() }}%</strong></div>
            </div>
            <div class="ov-card">
              <h3>💳 ملخص المصروفات</h3>
              <div class="ov-row main"><span>إجمالي المصروفات</span><strong>{{ fmtCurrency(totalExpenses()) }}</strong></div>
              @for (cat of expensesByCategory(); track cat.category) {
                <div class="ov-row"><span>{{ cat.category }}</span><strong>{{ fmtCurrency(cat.total) }}</strong></div>
              }
              <div class="ov-divider"></div>
              <div class="ov-row main highlight">
                <span>صافي الدخل</span>
                <strong [class.text-green]="netIncome() >= 0" [class.text-red]="netIncome() < 0">{{ fmtCurrency(netIncome()) }}</strong>
              </div>
            </div>
          </div>
        }

        <!-- CREATE INVOICE DIALOG -->
        @if (showInvoice()) {
          <div class="tmk-overlay" (click)="showInvoice.set(false)">
            <div class="tmk-modal lg" (click)="$event.stopPropagation()">
              <div class="modal-header">
                <h3>🧾 فاتورة إلكترونية جديدة <span class="zatca-mini">🛡️ ZATCA</span></h3>
                <button (click)="showInvoice.set(false)">✕</button>
              </div>
              <div class="modal-body">
                <div class="form-row">
                  <div class="form-group"><label>نوع الفاتورة</label>
                    <select [(ngModel)]="invForm.invoiceType" class="tmk-select">
                      <option value="standard">فاتورة ضريبية</option>
                      <option value="simplified">فاتورة مبسطة</option>
                    </select>
                  </div>
                  <div class="form-group"><label>العميل <span class="req">*</span></label>
                    <select [(ngModel)]="invForm.clientId" class="tmk-select">
                      <option value="">اختر العميل...</option>
                      @for (c of store.clients(); track c.id) { <option [value]="c.id">{{ c.name }}</option> }
                    </select>
                  </div>
                </div>
                <div class="form-group"><label>القضية المرتبطة</label>
                  <select [(ngModel)]="invForm.caseId" class="tmk-select">
                    <option value="">بدون ربط بقضية</option>
                    @for (c of store.cases(); track c.id) { <option [value]="c.id">{{ c.title }} — {{ store.clientName(c.clientId) }}</option> }
                  </select>
                </div>
                <div class="form-group"><label>وصف الخدمة</label><input [(ngModel)]="invForm.description" class="tmk-input" placeholder="أتعاب تمثيل قانوني"></div>
                <div class="form-row">
                  <div class="form-group"><label>الكمية</label><input type="number" [(ngModel)]="invForm.quantity" class="tmk-input" dir="ltr" min="1"></div>
                  <div class="form-group"><label>سعر الوحدة (ر.س) <span class="req">*</span></label><input type="number" [(ngModel)]="invForm.unitPrice" class="tmk-input" dir="ltr"></div>
                </div>
                <div class="form-group">
                  <label class="checkbox-label"><input type="checkbox" [(ngModel)]="invForm.includeVat"> تضمين ضريبة القيمة المضافة (15%)</label>
                </div>
                <!-- Invoice Preview -->
                @if (invForm.unitPrice > 0) {
                  <div class="inv-preview">
                    <div class="ip-row"><span>المبلغ الفرعي</span><span>{{ fmtCurrency(invSubtotal()) }}</span></div>
                    @if (invForm.includeVat) {
                      <div class="ip-row"><span>ضريبة القيمة المضافة (15%)</span><span>{{ fmtCurrency(invVat()) }}</span></div>
                    }
                    <div class="ip-row total"><span>الإجمالي</span><strong>{{ fmtCurrency(invTotal()) }}</strong></div>
                  </div>
                }
              </div>
              <div class="modal-footer">
                <button class="tmk-btn outline" (click)="showInvoice.set(false)">إلغاء</button>
                <button class="tmk-btn primary" (click)="submitInvoice()" [disabled]="!invForm.clientId || !invForm.unitPrice">إصدار الفاتورة</button>
              </div>
            </div>
          </div>
        }

        <!-- ADD EXPENSE DIALOG -->
        @if (showExpense()) {
          <div class="tmk-overlay" (click)="showExpense.set(false)">
            <div class="tmk-modal" (click)="$event.stopPropagation()">
              <div class="modal-header"><h3>💳 مصروف جديد</h3><button (click)="showExpense.set(false)">✕</button></div>
              <div class="modal-body">
                <div class="form-group"><label>الوصف <span class="req">*</span></label><input [(ngModel)]="expForm.description" class="tmk-input"></div>
                <div class="form-row">
                  <div class="form-group"><label>المبلغ <span class="req">*</span></label><input type="number" [(ngModel)]="expForm.amount" class="tmk-input" dir="ltr"></div>
                  <div class="form-group"><label>الفئة</label>
                    <select [(ngModel)]="expForm.category" class="tmk-select">
                      <option value="إيجار">إيجار</option><option value="رواتب">رواتب</option><option value="خدمات">خدمات</option><option value="تقنية">تقنية</option><option value="أخرى">أخرى</option>
                    </select>
                  </div>
                </div>
                <div class="form-group"><label>التاريخ</label><input type="date" [(ngModel)]="expForm.date" class="tmk-input"></div>
              </div>
              <div class="modal-footer">
                <button class="tmk-btn outline" (click)="showExpense.set(false)">إلغاء</button>
                <button class="tmk-btn primary" (click)="submitExpense()" [disabled]="!expForm.description || !expForm.amount">حفظ</button>
              </div>
            </div>
          </div>
        }

        <!-- EDIT INVOICE DIALOG -->
        @if (showEditInvoice()) {
          <div class="tmk-overlay" (click)="showEditInvoice.set(false)">
            <div class="tmk-modal lg" (click)="$event.stopPropagation()">
              <div class="modal-header">
                <h3>✏️ تعديل فاتورة #{{ editInvForm.invoiceNumber }}</h3>
                <button (click)="showEditInvoice.set(false)">✕</button>
              </div>
              <div class="modal-body">
                <div class="form-row">
                  <div class="form-group"><label>الحالة</label>
                    <select [(ngModel)]="editInvForm.status" class="tmk-select">
                      <option value="draft">مسودة</option>
                      <option value="issued">صادرة</option>
                      <option value="paid">مدفوعة</option>
                      <option value="overdue">متأخرة</option>
                      <option value="cancelled">ملغاة</option>
                    </select>
                  </div>
                  <div class="form-group"><label>العميل</label>
                    <select [(ngModel)]="editInvForm.clientId" class="tmk-select">
                      @for (c of store.clients(); track c.id) { <option [value]="c.id">{{ c.name }}</option> }
                    </select>
                  </div>
                </div>
                <div class="form-group"><label>القضية المرتبطة</label>
                  <select [(ngModel)]="editInvForm.caseId" class="tmk-select">
                    <option value="">بدون ربط بقضية</option>
                    @for (c of store.cases(); track c.id) { <option [value]="c.id">{{ c.title }}</option> }
                  </select>
                </div>
                <div class="form-row">
                  <div class="form-group"><label>المبلغ الفرعي (ر.س)</label><input type="number" [(ngModel)]="editInvForm.subtotal" class="tmk-input" dir="ltr"></div>
                  <div class="form-group"><label>ضريبة القيمة المضافة (ر.س)</label><input type="number" [(ngModel)]="editInvForm.vatAmount" class="tmk-input" dir="ltr"></div>
                </div>
                <div class="form-row">
                  <div class="form-group"><label>الإجمالي (ر.س)</label>
                    <input type="number" [value]="editInvForm.subtotal + editInvForm.vatAmount" class="tmk-input" dir="ltr" disabled>
                  </div>
                  <div class="form-group"><label>المبلغ المسدد (ر.س)</label><input type="number" [(ngModel)]="editInvForm.paidAmount" class="tmk-input" dir="ltr"></div>
                </div>
                <div class="form-row">
                  <div class="form-group"><label>تاريخ الإصدار</label><input type="date" [(ngModel)]="editInvForm.issueDate" class="tmk-input"></div>
                  <div class="form-group"><label>تاريخ الاستحقاق</label><input type="date" [(ngModel)]="editInvForm.dueDate" class="tmk-input"></div>
                </div>
              </div>
              <div class="modal-footer">
                <button class="tmk-btn outline" (click)="showEditInvoice.set(false)">إلغاء</button>
                <button class="tmk-btn primary" (click)="saveEditInvoice()">💾 حفظ التعديلات</button>
              </div>
            </div>
          </div>
        }
      </div>
    </app-dashboard-layout>
  `,
  styles: [`
    .page { max-width: 1400px; margin: 0 auto; }
    .dga-breadcrumb { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; color: var(--text-secondary, #6b7280); margin-bottom: 0.5rem; }
    .dga-breadcrumb a { color: var(--text-secondary, #6b7280); text-decoration: none; } .dga-breadcrumb a:hover { text-decoration: underline; } .dga-breadcrumb .sep { opacity: 0.5; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
    .page-header h1 { font-size: 1.5rem; font-weight: 800; margin: 0; }
    .page-header p { color: var(--text-secondary); margin: 0.25rem 0 0; font-size: 0.9rem; }
    .fin-overview { display: grid; grid-template-columns: repeat(5, 1fr); gap: 1rem; margin-bottom: 2rem; }
    @media(max-width:900px) { .fin-overview { grid-template-columns: repeat(3, 1fr); } }
    .fin-card { background: var(--card-bg,#fff); border-radius: 12px; border: 1px solid rgba(0,0,0,0.06); border-top: 3px solid; padding: 1.25rem; display: flex; align-items: center; gap: 0.75rem; }
    .fc-icon { width: 2.5rem; height: 2.5rem; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; flex-shrink: 0; }
    .fc-info small { display: block; font-size: 0.75rem; color: var(--text-secondary); }
    .fc-info strong { font-size: 1.15rem; font-weight: 800; }
    .tabs { display: flex; border-bottom: 2px solid rgba(0,0,0,0.06); margin-bottom: 1.5rem; }
    .tabs button { padding: 0.75rem 1.5rem; border: none; border-bottom: 2px solid transparent; margin-bottom: -2px; background: transparent; font-family: inherit; font-size: 0.9rem; cursor: pointer; color: var(--text-secondary); }
    .tabs button.active { color: var(--tmk-primary, #1B8354); border-bottom-color: var(--tmk-primary, #1B8354); font-weight: 600; }
    .filters { display: flex; gap: 0.75rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
    .search { flex: 1; min-width: 200px; }
    .section-top { display: flex; justify-content: space-between; margin-bottom: 1rem; }
    .table-wrap { overflow-x: auto; }
    .tmk-table { width: 100%; border-collapse: collapse; background: var(--card-bg,#fff); border-radius: 12px; overflow: hidden; border: 1px solid rgba(0,0,0,0.06); }
    .tmk-table th { padding: 0.75rem 1rem; text-align: right; font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); background: rgba(0,0,0,0.02); }
    .tmk-table td { padding: 0.75rem 1rem; border-bottom: 1px solid rgba(0,0,0,0.04); font-size: 0.9rem; }
    .mono { font-family: monospace; }
    .link { color: var(--tmk-primary, #1B8354); text-decoration: none; font-weight: 600; }
    .link:hover { text-decoration: underline; }
    .muted { color: var(--text-secondary); opacity: 0.5; }
    .badge { padding: 0.2rem 0.6rem; border-radius: 12px; font-size: 0.75rem; font-weight: 600; }
    .b-draft { background: rgba(107,114,128,0.1); color: #6b7280; }
    .b-issued { background: rgba(59,130,246,0.1); color: #3b82f6; }
    .b-paid { background: rgba(16,185,129,0.1); color: #10b981; }
    .b-overdue { background: rgba(239,68,68,0.1); color: #ef4444; }
    .b-partially_paid { background: rgba(139,92,246,0.1); color: #8b5cf6; }
    .zatca-badge { font-size: 0.7rem; padding: 0.15rem 0.4rem; border-radius: 4px; background: rgba(245,158,11,0.1); color: #d97706; }
    .zatca-badge.compliant { background: rgba(16,185,129,0.1); color: #059669; }
    .text-red { color: #ef4444 !important; }
    .text-green { color: #10b981 !important; }
    .text-orange { color: #f59e0b !important; }
    .cat-badge { font-size: 0.8rem; padding: 0.15rem 0.5rem; border-radius: 6px; background: rgba(0,0,0,0.04); }
    .empty { text-align: center; padding: 2rem !important; color: var(--text-secondary); }
    .overview-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
    @media(max-width:800px) { .overview-grid { grid-template-columns: 1fr; } }
    .ov-card { background: var(--card-bg,#fff); border-radius: 14px; border: 1px solid rgba(0,0,0,0.06); padding: 1.5rem; }
    .ov-card h3 { font-size: 1.05rem; font-weight: 700; margin: 0 0 1rem; }
    .ov-row { display: flex; justify-content: space-between; padding: 0.5rem 0; font-size: 0.9rem; }
    .ov-row span { color: var(--text-secondary); }
    .ov-row.main { font-weight: 700; }
    .ov-row.highlight { padding: 0.75rem; background: rgba(0,0,0,0.02); border-radius: 8px; font-size: 1rem; }
    .ov-divider { height: 1px; background: rgba(0,0,0,0.06); margin: 0.5rem 0; }
    .inv-preview { background: rgba(0,0,0,0.02); border-radius: 10px; padding: 1rem; margin-top: 0.5rem; border: 1px solid rgba(0,0,0,0.06); }
    .ip-row { display: flex; justify-content: space-between; padding: 0.35rem 0; font-size: 0.9rem; }
    .ip-row.total { border-top: 2px solid rgba(0,0,0,0.1); padding-top: 0.5rem; margin-top: 0.25rem; color: var(--tmk-primary, #1B8354); font-size: 1.05rem; }
    .zatca-mini { font-size: 0.7rem; background: rgba(16,185,129,0.1); color: #10b981; padding: 0.15rem 0.4rem; border-radius: 4px; }
    .checkbox-label { display: flex; align-items: center; gap: 0.5rem; font-size: 0.9rem; cursor: pointer; }
    .tmk-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); z-index: 2000; display: flex; align-items: center; justify-content: center; }
    .tmk-modal { background: var(--card-bg,#fff); border-radius: 16px; width: 90%; max-width: 550px; max-height: 90vh; overflow-y: auto; }
    .tmk-modal.lg { max-width: 650px; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 1.5rem; border-bottom: 1px solid rgba(0,0,0,0.08); }
    .modal-header h3 { font-size: 1.1rem; font-weight: 700; margin: 0; display: flex; align-items: center; gap: 0.5rem; }
    .modal-header button { background: none; border: none; font-size: 1.25rem; cursor: pointer; }
    .modal-body { padding: 1.5rem; }
    .modal-footer { display: flex; justify-content: flex-end; gap: 0.75rem; padding: 1rem 1.5rem; border-top: 1px solid rgba(0,0,0,0.08); }
    .form-group { margin-bottom: 1rem; }
    .form-group label { display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.35rem; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .req { color: #ef4444; }
    .tmk-input,.tmk-select { width: 100%; padding: 0.6rem 0.8rem; border: 1px solid rgba(0,0,0,0.15); border-radius: 8px; font-family: inherit; font-size: 0.9rem; box-sizing: border-box; background: var(--card-bg,#fff); }
    .tmk-input:focus,.tmk-select:focus { outline: none; border-color: var(--tmk-primary, #1B8354); box-shadow: 0 0 0 3px rgba(27,131,84,0.1); }
    .tmk-btn { padding: 0.55rem 1.25rem; border-radius: 8px; border: none; font-family: inherit; font-size: 0.85rem; font-weight: 600; cursor: pointer; }
    .tmk-btn.primary { background: var(--tmk-primary, #1B8354); color: white; }
    .tmk-btn.primary:disabled { opacity: 0.5; }
    .tmk-btn.outline { background: transparent; border: 1px solid rgba(0,0,0,0.12); }
    .tmk-btn.sm { padding: 0.35rem 0.75rem; font-size: 0.8rem; }
    .action-btns { display: flex; gap: 0.4rem; }

    /* ── Dark Mode ── */
    :host-context([data-theme="dark"]) {
      .fin-card, .ov-card, .inv-preview { background: var(--card-bg); border-color: var(--border-light, #384250); }
      .tmk-table { background: var(--card-bg); border-color: var(--border-light, #384250); }
      .tmk-table th { background: rgba(255,255,255,0.03); }
      .tmk-table td { border-color: var(--border-light, #384250); }
      .tmk-input, .tmk-select { background: var(--card-bg); color: var(--text-primary); border-color: var(--border-light, #384250); }
      .tmk-modal { background: var(--card-bg); }
      .modal-header, .modal-footer { border-color: var(--border-light, #384250); }
    }
  `]
})
export class FinanceComponent implements OnInit {
  private route = inject(ActivatedRoute);
  store = inject(StoreService);
  tab = signal<string>('invoices');

  ngOnInit() {
    const tabParam = this.route.snapshot.paramMap.get('tab');
    if (tabParam && ['invoices', 'expenses', 'overview', 'payroll', 'reports'].includes(tabParam)) {
      this.tab.set(tabParam);
    }
  }
  showInvoice = signal(false);
  showExpense = signal(false);
  showEditInvoice = signal(false);
  invoiceSearch = signal('');
  invoiceStatusFilter = signal('');

  invForm = { clientId: '', caseId: '', invoiceType: 'standard' as string, description: '', quantity: 1, unitPrice: 0, includeVat: true };
  expForm = { description: '', amount: 0, category: 'خدمات', date: new Date().toISOString().split('T')[0] };
  editInvForm = { id: '', invoiceNumber: '', clientId: '', caseId: '', status: '', subtotal: 0, vatAmount: 0, paidAmount: 0, issueDate: '', dueDate: '' };

  finCards = computed(() => {
    const inv = this.store.invoices();
    const paid = inv.filter(i => i.status === 'paid').reduce((a, i) => a + (i.total || 0), 0);
    const pending = inv.filter(i => i.status === 'issued').reduce((a, i) => a + ((i.total || 0) - (i.paidAmount || 0)), 0);
    const overdue = inv.filter(i => i.status === 'overdue').reduce((a, i) => a + ((i.total || 0) - (i.paidAmount || 0)), 0);
    const expenses = this.store.expenses().reduce((a, e) => a + e.amount, 0);
    return [
      { label: 'إجمالي الإيرادات', value: formatCurrency(paid), icon: '📈', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
      { label: 'فواتير معلقة', value: formatCurrency(pending), icon: '⏳', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
      { label: 'فواتير متأخرة', value: formatCurrency(overdue), icon: '⚠️', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
      { label: 'المصروفات', value: formatCurrency(expenses), icon: '💳', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
      { label: 'صافي الدخل', value: formatCurrency(paid - expenses), icon: '💰', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
    ];
  });

  filteredInvoices = computed(() => {
    let list = this.store.invoices();
    const statusFilter = this.invoiceStatusFilter();
    const search = this.invoiceSearch();
    if (statusFilter) list = list.filter(i => i.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(i => (i.invoiceNumber || '').toLowerCase().includes(q) || this.store.clientName(i.clientId).toLowerCase().includes(q));
    }
    return list;
  });

  totalIssued = computed(() => this.store.invoices().reduce((a, i) => a + (i.total || 0), 0));
  totalPaid = computed(() => this.store.invoices().filter(i => i.status === 'paid').reduce((a, i) => a + (i.total || 0), 0));
  totalPending = computed(() => this.store.invoices().filter(i => i.status === 'issued').reduce((a, i) => a + ((i.total || 0) - (i.paidAmount || 0)), 0));
  totalOverdue = computed(() => this.store.invoices().filter(i => i.status === 'overdue').reduce((a, i) => a + ((i.total || 0) - (i.paidAmount || 0)), 0));
  totalVat = computed(() => this.store.invoices().filter(i => i.status === 'paid').reduce((a, i) => a + (i.vatAmount || 0), 0));
  totalExpenses = computed(() => this.store.expenses().reduce((a, e) => a + e.amount, 0));
  netIncome = computed(() => this.totalPaid() - this.totalExpenses());
  collectionRate = computed(() => this.totalIssued() > 0 ? Math.round(this.totalPaid() / this.totalIssued() * 100) : 0);
  expensesByCategory = computed(() => {
    const map = new Map<string, number>();
    this.store.expenses().forEach(e => map.set(e.category, (map.get(e.category) || 0) + e.amount));
    return Array.from(map.entries()).map(([category, total]) => ({ category, total }));
  });

  invSubtotal = computed(() => this.invForm.quantity * this.invForm.unitPrice);
  invVat = computed(() => this.invForm.includeVat ? this.invSubtotal() * 0.15 : 0);
  invTotal = computed(() => this.invSubtotal() + this.invVat());

  fmtCurrency = formatCurrency;
  isOverdue(d: string) { return new Date(d) < new Date(); }
  getCaseTitle(id: string) { return this.store.getCase(id)?.title || '—'; }
  getInvStatusLabel(s: string) { return { draft: 'مسودة', issued: 'صادرة', paid: 'مدفوعة', overdue: 'متأخرة', partially_paid: 'جزئية', cancelled: 'ملغاة' }[s] || s; }

  markAsPaid(id: string) { this.store.updateInvoice(id, { status: 'paid' as any, paidAmount: this.store.invoices().find(i => i.id === id)?.total || 0 }); }

  editInvoice(inv: any) {
    this.editInvForm = {
      id: inv.id, invoiceNumber: inv.invoiceNumber, clientId: inv.clientId,
      caseId: inv.caseId || '', status: inv.status, subtotal: inv.subtotal || 0,
      vatAmount: inv.vatAmount || 0, paidAmount: inv.paidAmount || 0,
      issueDate: inv.issueDate || '', dueDate: inv.dueDate || ''
    };
    this.showEditInvoice.set(true);
  }

  saveEditInvoice() {
    const f = this.editInvForm;
    this.store.updateInvoice(f.id, {
      clientId: f.clientId, caseId: f.caseId || undefined, status: f.status as any,
      subtotal: f.subtotal, vatAmount: f.vatAmount, total: f.subtotal + f.vatAmount,
      paidAmount: f.paidAmount, issueDate: f.issueDate, dueDate: f.dueDate,
      updatedAt: new Date().toISOString(),
    });
    this.showEditInvoice.set(false);
  }

  submitInvoice() {
    if (!this.invForm.clientId || !this.invForm.unitPrice) return;
    const sub = this.invSubtotal();
    const vat = this.invVat();
    this.store.addInvoice({
      id: this.store.generateId('INV'),
      invoiceNumber: `INV-${new Date().getFullYear()}-${String(this.store.invoices().length + 1).padStart(3, '0')}`,
      clientId: this.invForm.clientId, caseId: this.invForm.caseId || undefined,
      invoiceType: this.invForm.invoiceType as any, subtotal: sub, vatAmount: vat, total: sub + vat,
      status: 'issued', paidAmount: 0, zatcaCompliant: true,
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      items: [{ description: this.invForm.description || 'خدمات قانونية', quantity: this.invForm.quantity, unitPrice: this.invForm.unitPrice, amount: sub, vatRate: this.invForm.includeVat ? 15 : 0, vatAmount: vat }],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    } as any);
    this.showInvoice.set(false);
    this.invForm = { clientId: '', caseId: '', invoiceType: 'standard', description: '', quantity: 1, unitPrice: 0, includeVat: true };
  }

  submitExpense() {
    if (!this.expForm.description || !this.expForm.amount) return;
    this.store.addExpense({
      id: this.store.generateId('EXP'), description: this.expForm.description,
      amount: this.expForm.amount, category: this.expForm.category, date: this.expForm.date,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    } as any);
    this.showExpense.set(false);
    this.expForm = { description: '', amount: 0, category: 'خدمات', date: new Date().toISOString().split('T')[0] };
  }
}
