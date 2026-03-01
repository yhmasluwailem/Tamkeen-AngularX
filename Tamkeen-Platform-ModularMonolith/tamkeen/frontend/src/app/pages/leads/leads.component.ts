import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DashboardLayoutComponent } from '../../layouts/dashboard/dashboard-layout.component';
import { StoreService } from '../../core/services/store.service';
import { formatCurrency, formatRelativeDate } from '../../core/utils/formatters';
import { Lead } from '../../core/models';

type ViewMode = 'list' | 'kanban';

const STATUS_CONFIG: Record<string, { label: string; desc: string; color: string; bg: string; border: string; icon: string; helpText: string }> = {
  intake:       { label: 'استقبال',     desc: 'طلب جديد وارد — يحتاج تحديد موعد استشارة',      color: '#1B8354', bg: 'rgba(27,131,84,0.08)',   border: 'rgba(27,131,84,0.25)',  icon: 'bi-inbox-fill',             helpText: 'تسجيل البيانات الأولية وتحديد موعد الاستشارة' },
  consultation: { label: 'استشارة',     desc: 'تمت جدولة الاستشارة أو إجراؤها',                color: '#2563eb', bg: 'rgba(37,99,235,0.08)',   border: 'rgba(37,99,235,0.25)',  icon: 'bi-chat-dots-fill',         helpText: 'الاجتماع مع العميل وفهم المشكلة القانونية' },
  case_study:   { label: 'دراسة الملف', desc: 'دراسة المستندات وتقييم الجدوى القانونية',       color: '#7c3aed', bg: 'rgba(124,58,237,0.08)',  border: 'rgba(124,58,237,0.25)', icon: 'bi-search',                 helpText: 'فحص تعارض المصالح وتقييم جدوى القضية' },
  fee_proposal: { label: 'عرض أتعاب',  desc: 'تم إرسال عرض الأتعاب — بانتظار موافقة العميل',  color: '#d97706', bg: 'rgba(217,119,6,0.08)',   border: 'rgba(217,119,6,0.25)',  icon: 'bi-file-earmark-text-fill', helpText: 'إعداد عرض الأتعاب وخطة الدفع' },
  engagement:   { label: 'تعاقد',       desc: 'تم توقيع عقد الأتعاب والوكالة — جاهز للتحويل', color: '#059669', bg: 'rgba(5,150,105,0.08)',   border: 'rgba(5,150,105,0.25)',  icon: 'bi-check-circle-fill',      helpText: 'توقيع عقد الأتعاب وإصدار الوكالة عبر ناجز' },
  converted:    { label: 'تم التحويل',  desc: 'تم فتح ملف القضية والبدء بالعمل',               color: '#1B8354', bg: 'rgba(27,131,84,0.08)',   border: 'rgba(27,131,84,0.25)',  icon: 'bi-arrow-repeat',           helpText: '' },
  declined:     { label: 'اعتذار',      desc: 'المكتب اعتذر عن قبول القضية',                   color: '#dc2626', bg: 'rgba(220,38,38,0.08)',   border: 'rgba(220,38,38,0.25)',  icon: 'bi-x-circle-fill',          helpText: '' },
  withdrawn:    { label: 'انسحاب',      desc: 'العميل انسحب ولم يكمل الإجراءات',               color: '#9ca3af', bg: 'rgba(156,163,175,0.08)', border: 'rgba(156,163,175,0.25)', icon: 'bi-dash-circle-fill',      helpText: '' },
};

const SOURCE_CONFIG: Record<string, { label: string; icon: string }> = {
  whatsapp: { label: 'واتساب', icon: 'bi-whatsapp' }, referral: { label: 'إحالة', icon: 'bi-people-fill' },
  website: { label: 'الموقع', icon: 'bi-globe2' }, phone: { label: 'اتصال', icon: 'bi-telephone-fill' },
  walk_in: { label: 'زيارة مباشرة', icon: 'bi-person-walking' }, social_media: { label: 'تواصل اجتماعي', icon: 'bi-share-fill' },
  najiz: { label: 'ناجز', icon: 'bi-building' }, other: { label: 'أخرى', icon: 'bi-tag-fill' },
};

const STATUS_FLOW: string[] = ['intake', 'consultation', 'case_study', 'fee_proposal', 'engagement'];

const LEGAL_ISSUE_TYPES = [
  { value: 'تجاري', label: 'تجاري' }, { value: 'عمالي', label: 'عمالي' },
  { value: 'أحوال شخصية', label: 'أحوال شخصية' }, { value: 'جزائي', label: 'جزائي' },
  { value: 'تنفيذ', label: 'تنفيذ' }, { value: 'عقاري', label: 'عقاري' },
  { value: 'إداري', label: 'إداري' }, { value: 'استشارة عامة', label: 'استشارة عامة' },
];

@Component({
  selector: 'app-leads',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DashboardLayoutComponent],
  template: `
    <app-dashboard-layout>
      <div class="dga-page" dir="rtl">
        <nav class="dga-breadcrumb"><a routerLink="/home">إستعراض</a><span class="sep">‹</span><span>مسار استقبال العملاء</span></nav>
        <div class="dga-page-title"><h1>مسار استقبال العملاء</h1><a routerLink="/home" class="back-link">رجوع →</a></div>

        <!-- FLOW BANNER -->
        <div class="flow-banner"><div class="flow-steps">
          @for (s of statusFlow; track s; let i = $index) {
            <div class="flow-step">
              <div class="fs-icon" [style.background]="getStatusConfig(s).bg" [style.color]="getStatusConfig(s).color"><i class="bi" [class]="getStatusConfig(s).icon"></i></div>
              <div class="fs-info"><strong>{{ getStatusConfig(s).label }}</strong><small>{{ getStatusConfig(s).helpText }}</small></div>
            </div>
            @if (i < statusFlow.length - 1) { <div class="fs-arrow"><i class="bi bi-chevron-left"></i></div> }
          }
        </div></div>

        <div class="dga-layout">
          <div class="dga-main"><div class="dga-content-card">
            <div class="search-header">
              <div class="search-title"><i class="bi bi-people-fill"></i><span>ملفات الاستقبال</span></div>
              <div class="header-right">
                <span class="case-count">{{ filteredLeads().length }} طلب</span>
                <div class="view-toggle">
                  <button [class.active]="viewMode() === 'kanban'" (click)="viewMode.set('kanban')"><i class="bi bi-kanban"></i></button>
                  <button [class.active]="viewMode() === 'list'" (click)="viewMode.set('list')"><i class="bi bi-list-ul"></i></button>
                </div>
              </div>
            </div>
            <div class="search-bar"><div class="search-input-wrap">
              <input class="search-input" [ngModel]="searchQuery()" (ngModelChange)="searchQuery.set($event)" placeholder="ابحث بالاسم أو الجوال...">
              <i class="bi bi-search search-icon"></i>
            </div></div>
            <div class="filters-row">
              <div class="sort-label"><i class="bi bi-sort-down"></i><span>ترتيب حسب التاريخ</span></div>
              <div class="filter-chips">
                <select class="filter-chip" [ngModel]="filterStatus()" (ngModelChange)="filterStatus.set($event)">
                  <option value="">كل المراحل</option>
                  <option value="intake">استقبال</option><option value="consultation">استشارة</option>
                  <option value="case_study">دراسة الملف</option><option value="fee_proposal">عرض أتعاب</option>
                  <option value="engagement">تعاقد</option><option value="converted">تم التحويل</option>
                  <option value="declined">اعتذار</option><option value="withdrawn">انسحاب</option>
                </select>
                <select class="filter-chip" [ngModel]="filterSource()" (ngModelChange)="filterSource.set($event)">
                  <option value="">كل المصادر</option>
                  @for (s of sourceOptions; track s.value) { <option [value]="s.value">{{ s.label }}</option> }
                </select>
                @if (filterStatus() || searchQuery() || filterSource()) {
                  <button class="clear-filter-btn" (click)="clearFilters()"><i class="bi bi-x-lg"></i> مسح</button>
                }
              </div>
            </div>

            <!-- KANBAN -->
            @if (viewMode() === 'kanban') {
              <div class="kanban-board">
                @for (col of kanbanColumns(); track col.status) {
                  <div class="kanban-col">
                    <div class="kanban-header" [style.border-top-color]="col.color">
                      <div class="kh-left"><i class="bi" [class]="col.icon"></i><span>{{ col.label }}</span></div>
                      <span class="kanban-count">{{ col.leads.length }}</span>
                    </div>
                    <div class="kanban-body" (dragover)="onDragOver($event)" (dragleave)="onDragLeave($event)" (drop)="onDrop($event, col.status)">
                      @for (lead of col.leads; track lead.id) {
                        <div class="kanban-card" [attr.draggable]="true" (dragstart)="onDragStart($event, lead)" (dragend)="onDragEnd($event)" (click)="selectLead(lead)">
                          <div class="kcard-top"><strong>{{ lead.name }}</strong><i class="bi" [class]="getSourceConfig(lead.source).icon" [title]="getSourceConfig(lead.source).label"></i></div>
                          @if (lead.legalIssueType) {
                            <p class="kcard-type"><i class="bi bi-briefcase"></i> {{ lead.legalIssueType }}
                              @if (lead.urgencyLevel === 'urgent' || lead.urgencyLevel === 'critical') { <span class="urgency-dot" [class.critical]="lead.urgencyLevel === 'critical'"></span> }
                            </p>
                          }
                          @if (lead.status === 'case_study') {
                            <div class="kcard-checks">
                              <span [class.done]="lead.conflictCheck"><i class="bi" [class]="lead.conflictCheck ? 'bi-check-circle-fill' : 'bi-circle'"></i> فحص التعارض</span>
                              @if (lead.caseMerit) { <span class="merit-badge" [class]="'merit-' + lead.caseMerit">{{ getMeritLabel(lead.caseMerit) }}</span> }
                            </div>
                          }
                          @if (lead.status === 'engagement') {
                            <div class="kcard-checks">
                              <span [class.done]="lead.contractSigned"><i class="bi" [class]="lead.contractSigned ? 'bi-check-circle-fill' : 'bi-circle'"></i> عقد الأتعاب</span>
                              <span [class.done]="lead.poaNumber"><i class="bi" [class]="lead.poaNumber ? 'bi-check-circle-fill' : 'bi-circle'"></i> الوكالة</span>
                            </div>
                          }
                          @if (lead.assignedTo) {
                            <div class="kcard-assignee"><div class="kcard-avatar" [style.background]="col.color">{{ getEmployeeInitials(lead.assignedTo) }}</div><span>{{ store.employeeName(lead.assignedTo) }}</span></div>
                          }
                          <div class="kcard-footer">
                            @if (lead.proposedAmount) { <span class="kcard-amount">{{ fmtCurrency(lead.proposedAmount) }}</span> }
                            @if (lead.consultationFee && !lead.proposedAmount) { <span class="kcard-cfee">استشارة: {{ fmtCurrency(lead.consultationFee) }}</span> }
                            @if (lead.nextFollowUp) { <span class="kcard-date" [class.overdue]="isOverdue(lead.nextFollowUp)"><i class="bi bi-calendar3"></i> {{ fmtRelative(lead.nextFollowUp) }}</span> }
                          </div>
                        </div>
                      } @empty { <div class="kanban-empty"><i class="bi bi-inbox"></i><span>لا توجد طلبات</span></div> }
                    </div>
                  </div>
                }
              </div>
            }

            <!-- LIST -->
            @if (viewMode() === 'list') {
              <div class="leads-table-wrap"><table class="tmk-table"><thead><tr>
                <th>العميل</th><th>المرحلة</th><th>نوع القضية</th><th>المحامي المسؤول</th><th>الأتعاب</th><th>المتابعة</th><th></th>
              </tr></thead><tbody>
                @for (lead of filteredLeads(); track lead.id) {
                  <tr class="lead-row" (click)="selectLead(lead)">
                    <td><div class="lead-name-cell"><div class="lead-avatar" [style.background]="getStatusConfig(lead.status).color">{{ lead.name.charAt(0) }}</div><div><strong>{{ lead.name }}</strong><small dir="ltr">{{ lead.phone }}</small></div></div></td>
                    <td><span class="status-badge" [style.background]="getStatusConfig(lead.status).bg" [style.color]="getStatusConfig(lead.status).color" [style.border-color]="getStatusConfig(lead.status).border"><i class="bi" [class]="getStatusConfig(lead.status).icon"></i> {{ getStatusConfig(lead.status).label }}</span></td>
                    <td>@if (lead.legalIssueType) { <span class="issue-tag">{{ lead.legalIssueType }}</span> } @else { <span class="muted">—</span> }</td>
                    <td>@if (lead.assignedTo) { <span class="assignee-badge"><span class="assignee-dot" [style.background]="getStatusConfig(lead.status).color">{{ getEmployeeInitials(lead.assignedTo) }}</span>{{ store.employeeName(lead.assignedTo) }}</span> } @else { <span class="muted">غير مُسند</span> }</td>
                    <td>@if (lead.proposedAmount) { <strong class="amount-text">{{ fmtCurrency(lead.proposedAmount) }}</strong> } @else { <span class="muted">—</span> }</td>
                    <td>@if (lead.nextFollowUp) { <span [class.overdue]="isOverdue(lead.nextFollowUp)">{{ fmtRelative(lead.nextFollowUp) }}</span> } @else { <span class="muted">—</span> }</td>
                    <td><button class="view-btn" (click)="selectLead(lead); $event.stopPropagation()">عرض ←</button></td>
                  </tr>
                } @empty { <tr><td colspan="7" class="empty-row">لا توجد طلبات مطابقة</td></tr> }
              </tbody></table></div>
            }
          </div></div>

          <!-- SIDEBAR -->
          <div class="dga-sidebar">
            <div class="sidebar-card sidebar-header-card"><div class="sidebar-title"><i class="bi bi-people-fill"></i><span>الاستقبال</span></div></div>
            <div class="sidebar-card">
              <div class="sidebar-section-title"><i class="bi bi-bar-chart-fill"></i><span>المراحل</span></div>
              @for (s of pipelineStats(); track s.status) {
                <div class="sidebar-item" [class.selected]="filterStatus() === s.status" (click)="toggleFilter(s.status)">
                  <div class="si-left"><div class="si-dot" [style.background]="s.color"></div><span>{{ s.label }}</span></div>
                  <span class="item-count">{{ s.count }}</span>
                </div>
              }
            </div>
            <div class="sidebar-card">
              <div class="sidebar-section-title"><i class="bi bi-cash-stack"></i><span>إجمالي الأتعاب المقترحة</span></div>
              <div class="pipeline-value"><span class="pv-amount">{{ fmtCurrency(pipelineValue()) }}</span><small>عروض قيد الانتظار</small></div>
            </div>
            <div class="sidebar-card">
              <div class="sidebar-section-title"><i class="bi bi-lightning-fill"></i><span>ملخص</span></div>
              <div class="quick-stat-row"><span>بحاجة استشارة</span><strong>{{ pendingConsultation() }}</strong></div>
              <div class="quick-stat-row"><span>بحاجة دراسة</span><strong>{{ pendingStudy() }}</strong></div>
              <div class="quick-stat-row"><span>بانتظار توقيع</span><strong>{{ pendingSigning() }}</strong></div>
              <div class="quick-stat-row"><span>جاهز للتحويل</span><strong>{{ readyToConvert() }}</strong></div>
            </div>
            <button class="sidebar-add-btn" (click)="openAddDialog()"><i class="bi bi-plus-circle"></i><span>طلب استقبال جديد</span></button>
          </div>
        </div>

        <!-- DRAG CONFIRM -->
        @if (showDragConfirm()) {
          <div class="tmk-overlay" (click)="cancelDrag()"><div class="drag-confirm-modal" (click)="$event.stopPropagation()">
            <div class="dcm-icon" [style.background]="getStatusConfig(dragTargetStatus()).bg" [style.color]="getStatusConfig(dragTargetStatus()).color"><i class="bi" [class]="getStatusConfig(dragTargetStatus()).icon"></i></div>
            <h3>نقل إلى مرحلة جديدة</h3>
            <p>هل تريد نقل <strong>{{ draggedLead()?.name }}</strong> إلى مرحلة <strong>{{ getStatusConfig(dragTargetStatus()).label }}</strong>؟</p>
            <div class="dcm-actions"><button class="btn-outline" (click)="cancelDrag()">إلغاء</button><button class="btn-primary" (click)="confirmDrag()"><i class="bi bi-check-lg"></i> تأكيد النقل</button></div>
          </div></div>
        }

        <!-- DETAIL PANEL -->
        @if (selectedLead()) {
          <div class="panel-overlay" (click)="selectedLead.set(null)"><div class="detail-panel" (click)="$event.stopPropagation()">
            <div class="panel-header">
              <div class="panel-lead-info">
                <div class="panel-avatar" [style.background]="getStatusConfig(selectedLead()!.status).color">{{ selectedLead()!.name.charAt(0) }}</div>
                <div><h2>{{ selectedLead()!.name }}</h2><span>{{ selectedLead()!.type === 'corporate' ? 'شركة' : 'فرد' }} — {{ getSourceConfig(selectedLead()!.source).label }}</span></div>
              </div>
              <button class="close-panel" (click)="selectedLead.set(null)"><i class="bi bi-x-lg"></i></button>
            </div>
            <div class="panel-status">
              <span class="status-badge large" [style.background]="getStatusConfig(selectedLead()!.status).bg" [style.color]="getStatusConfig(selectedLead()!.status).color">
                <i class="bi" [class]="getStatusConfig(selectedLead()!.status).icon"></i> {{ getStatusConfig(selectedLead()!.status).label }}
              </span>
              <small>{{ getStatusConfig(selectedLead()!.status).desc }}</small>
            </div>
            <div class="panel-tabs">
              <button [class.active]="panelTab() === 'overview'" (click)="panelTab.set('overview')">نظرة عامة</button>
              <button [class.active]="panelTab() === 'consultation'" (click)="panelTab.set('consultation')">الاستشارة</button>
              <button [class.active]="panelTab() === 'study'" (click)="panelTab.set('study')">الدراسة</button>
              <button [class.active]="panelTab() === 'proposal'" (click)="panelTab.set('proposal')">عرض الأتعاب</button>
              <button [class.active]="panelTab() === 'engagement'" (click)="panelTab.set('engagement')">التعاقد</button>
            </div>
            <div class="panel-content">
              <!-- OVERVIEW TAB -->
              @if (panelTab() === 'overview') {
                <div class="tab-content">
                  <div class="info-card"><h4><i class="bi bi-telephone-fill"></i> معلومات التواصل</h4>
                    <div class="info-row"><span>الجوال</span><strong dir="ltr">{{ selectedLead()!.phone }}</strong></div>
                    @if (selectedLead()!.email) { <div class="info-row"><span>البريد</span><strong dir="ltr">{{ selectedLead()!.email }}</strong></div> }
                  </div>
                  <div class="quick-contact">
                    <button class="qc-btn whatsapp" (click)="openWhatsApp(selectedLead()!)"><i class="bi bi-whatsapp"></i> واتساب</button>
                    <button class="qc-btn" (click)="callLead(selectedLead()!)"><i class="bi bi-telephone-fill"></i> اتصال</button>
                  </div>
                  <div class="info-card"><h4><i class="bi bi-briefcase-fill"></i> تفاصيل الطلب</h4>
                    @if (selectedLead()!.legalIssueType) { <div class="info-row"><span>نوع القضية</span><strong>{{ selectedLead()!.legalIssueType }}</strong></div> }
                    @if (selectedLead()!.urgencyLevel) { <div class="info-row"><span>الإلحاح</span><span class="urgency-label" [class]="'urgency-' + selectedLead()!.urgencyLevel">{{ getUrgencyLabel(selectedLead()!.urgencyLevel!) }}</span></div> }
                    @if (selectedLead()!.issueDescription) { <p class="issue-desc">{{ selectedLead()!.issueDescription }}</p> }
                  </div>
                  <div class="info-card"><h4><i class="bi bi-person-badge-fill"></i> المحامي المسؤول</h4>
                    <select class="dga-select" [ngModel]="selectedLead()!.assignedTo || ''" (ngModelChange)="assignEmployee(selectedLead()!.id, $event)">
                      <option value="">— غير مُسند —</option>
                      @for (emp of store.employees(); track emp.id) { <option [value]="emp.id">{{ emp.name }} — {{ emp.title || getRoleLabel(emp.role) }}</option> }
                    </select>
                  </div>
                  <div class="info-card"><h4>مسار التقدم</h4>
                    <div class="pipeline-progress">
                      @for (s of statusFlow; track s) {
                        <div class="pipe-step" [class.active]="getStatusIndex(selectedLead()!.status) >= $index" [class.current]="selectedLead()!.status === s">
                          <div class="pipe-dot" [style.background]="getStatusIndex(selectedLead()!.status) >= $index ? getStatusConfig(s).color : '#d1d5db'"></div>
                          <span class="pipe-label">{{ getStatusConfig(s).label }}</span>
                          @if ($index < statusFlow.length - 1) { <div class="pipe-line" [style.background]="getStatusIndex(selectedLead()!.status) > $index ? getStatusConfig(s).color : '#e5e7eb'"></div> }
                        </div>
                      }
                    </div>
                    <div class="pipe-actions">
                      @if (getNextStatus(selectedLead()!.status)) {
                        <button class="btn-primary" (click)="advanceStatus(selectedLead()!)"><i class="bi bi-arrow-left"></i> نقل إلى: {{ getStatusConfig(getNextStatus(selectedLead()!.status)!).label }}</button>
                      }
                      @if (selectedLead()!.status !== 'converted' && selectedLead()!.status !== 'declined' && selectedLead()!.status !== 'withdrawn') {
                        <button class="btn-outline danger" (click)="showDeclineDialog.set(true)"><i class="bi bi-x-lg"></i> اعتذار</button>
                      }
                    </div>
                  </div>
                  @if (selectedLead()!.status === 'engagement' && selectedLead()!.contractSigned && selectedLead()!.poaNumber) {
                    <div class="convert-card"><h4><i class="bi bi-arrow-repeat"></i> تحويل لقضية</h4><p>تم استكمال التعاقد — يمكن فتح ملف القضية</p>
                      <button class="btn-primary full" (click)="convertToCase(selectedLead()!)"><i class="bi bi-briefcase-fill"></i> فتح ملف القضية</button>
                    </div>
                  }
                  @if (selectedLead()!.status === 'engagement' && (!selectedLead()!.contractSigned || !selectedLead()!.poaNumber)) {
                    <div class="warning-card"><i class="bi bi-exclamation-triangle-fill"></i><div><strong>لا يمكن التحويل بعد</strong><p>يجب استكمال: {{ !selectedLead()!.contractSigned ? 'توقيع عقد الأتعاب' : '' }}{{ !selectedLead()!.contractSigned && !selectedLead()!.poaNumber ? ' و ' : '' }}{{ !selectedLead()!.poaNumber ? 'إصدار الوكالة الشرعية' : '' }}</p></div></div>
                  }
                </div>
              }
              <!-- CONSULTATION TAB -->
              @if (panelTab() === 'consultation') {
                <div class="tab-content">
                  <div class="info-card"><h4><i class="bi bi-calendar-event"></i> تفاصيل الاستشارة</h4>
                    <div class="form-group"><label>تاريخ الاستشارة</label><input type="date" class="dga-input" [ngModel]="selectedLead()!.consultationDate || ''" (ngModelChange)="updateField('consultationDate', $event)"></div>
                    <div class="form-row-2">
                      <div class="form-group"><label>رسوم الاستشارة (ريال)</label><input type="number" class="dga-input" dir="ltr" [ngModel]="selectedLead()!.consultationFee || 0" (ngModelChange)="updateField('consultationFee', $event)"></div>
                      <div class="form-group"><label>حالة الدفع</label><select class="dga-select" [ngModel]="selectedLead()!.consultationPaid || false" (ngModelChange)="updateField('consultationPaid', $event === 'true')"><option [value]="false">لم يتم الدفع</option><option [value]="true">تم الدفع</option></select></div>
                    </div>
                  </div>
                  <div class="info-card"><h4><i class="bi bi-journal-text"></i> ملاحظات الاستشارة</h4>
                    <textarea class="dga-textarea" rows="4" placeholder="سجل ملاحظات الاستشارة..." [ngModel]="selectedLead()!.consultationNotes || ''" (ngModelChange)="updateField('consultationNotes', $event)"></textarea>
                  </div>
                  <div class="info-card"><h4><i class="bi bi-clipboard-check"></i> التقييم المبدئي</h4>
                    <textarea class="dga-textarea" rows="3" placeholder="رأي المحامي المبدئي..." [ngModel]="selectedLead()!.initialAssessment || ''" (ngModelChange)="updateField('initialAssessment', $event)"></textarea>
                  </div>
                  <div class="info-card"><h4><i class="bi bi-chat-left-text"></i> سجل التواصل</h4>
                    <button class="btn-primary compact" (click)="showCommDialog.set(true)"><i class="bi bi-plus-lg"></i> تسجيل تواصل</button>
                    @for (comm of selectedLead()!.communications || []; track $index) {
                      <div class="comm-item"><div class="comm-header"><span class="comm-type-badge">{{ getCommTypeLabel(comm.type) }}</span><small>{{ fmtRelative(comm.date) }}</small></div><p>{{ comm.summary }}</p></div>
                    } @empty { <p class="empty-note">لا يوجد سجل تواصل بعد</p> }
                  </div>
                </div>
              }
              <!-- STUDY TAB -->
              @if (panelTab() === 'study') {
                <div class="tab-content">
                  <div class="info-card"><h4><i class="bi bi-shield-check"></i> فحص تعارض المصالح</h4>
                    <label class="toggle-option" [class.checked]="selectedLead()!.conflictCheck === true">
                      <input type="checkbox" [ngModel]="selectedLead()!.conflictCheck || false" (ngModelChange)="updateField('conflictCheck', $event)">
                      <span>{{ selectedLead()!.conflictCheck ? 'تم الفحص — لا يوجد تعارض' : 'لم يتم الفحص بعد' }}</span>
                    </label>
                    <div class="form-group" style="margin-top:0.5rem"><label>ملاحظات التعارض</label><textarea class="dga-textarea" rows="2" [ngModel]="selectedLead()!.conflictNotes || ''" (ngModelChange)="updateField('conflictNotes', $event)"></textarea></div>
                  </div>
                  <div class="info-card"><h4><i class="bi bi-graph-up-arrow"></i> تقييم الجدوى القانونية</h4>
                    <div class="merit-options">
                      @for (m of meritOptions; track m.value) {
                        <label class="role-option" [class.selected]="selectedLead()!.caseMerit === m.value"><input type="radio" [value]="m.value" [ngModel]="selectedLead()!.caseMerit || ''" (ngModelChange)="updateField('caseMerit', $event)" hidden><i class="bi" [class]="m.icon" [style.color]="m.color"></i><span>{{ m.label }}</span></label>
                      }
                    </div>
                    <div class="form-group"><label>ملاحظات الجدوى</label><textarea class="dga-textarea" rows="3" [ngModel]="selectedLead()!.meritNotes || ''" (ngModelChange)="updateField('meritNotes', $event)"></textarea></div>
                  </div>
                  <div class="info-card"><h4><i class="bi bi-speedometer2"></i> مستوى التعقيد</h4>
                    <div class="complexity-options">
                      @for (c of complexityOptions; track c.value) {
                        <label class="role-option" [class.selected]="selectedLead()!.complexityLevel === c.value"><input type="radio" [value]="c.value" [ngModel]="selectedLead()!.complexityLevel || ''" (ngModelChange)="updateField('complexityLevel', $event)" hidden><span>{{ c.label }}</span></label>
                      }
                    </div>
                  </div>
                </div>
              }
              <!-- PROPOSAL TAB -->
              @if (panelTab() === 'proposal') {
                <div class="tab-content">
                  @if (!selectedLead()!.proposedAmount) { <button class="btn-primary full" (click)="showProposalDialog.set(true)"><i class="bi bi-file-earmark-plus"></i> إنشاء عرض أتعاب</button> }
                  @if (selectedLead()!.proposedAmount) {
                    <div class="proposal-card"><h4><i class="bi bi-file-earmark-text"></i> عرض الأتعاب</h4>
                      @for (item of selectedLead()!.proposalItems || []; track $index) { <div class="proposal-item"><span>{{ item.description }}</span><strong>{{ fmtCurrency(item.quantity * item.unitPrice) }}</strong></div> }
                      <div class="proposal-total"><span>الإجمالي (شامل الضريبة)</span><strong>{{ fmtCurrency(selectedLead()!.proposedAmount!) }}</strong></div>
                      @if (selectedLead()!.paymentPlan) { <div class="info-row" style="margin-top:0.75rem"><span>خطة الدفع</span><strong>{{ selectedLead()!.paymentPlan }}</strong></div> }
                      <button class="btn-primary full" style="margin-top:0.75rem" (click)="createInvoiceFromProposal(selectedLead()!)"><i class="bi bi-receipt"></i> تحويل إلى فاتورة</button>
                    </div>
                  }
                  <div class="info-card" style="margin-top:1rem"><h4><i class="bi bi-credit-card"></i> خطة الدفع</h4>
                    <select class="dga-select" [ngModel]="selectedLead()!.paymentPlan || ''" (ngModelChange)="updateField('paymentPlan', $event)">
                      <option value="">— اختر —</option><option value="دفعة واحدة">دفعة واحدة</option><option value="قسطين">قسطين (50% + 50%)</option><option value="ثلاثة أقساط">ثلاثة أقساط</option><option value="حسب الجلسات">حسب الجلسات</option>
                    </select>
                  </div>
                </div>
              }
              <!-- ENGAGEMENT TAB -->
              @if (panelTab() === 'engagement') {
                <div class="tab-content">
                  <div class="info-card"><h4><i class="bi bi-file-earmark-check"></i> عقد الأتعاب</h4>
                    <label class="toggle-option" [class.checked]="selectedLead()!.contractSigned === true">
                      <input type="checkbox" [ngModel]="selectedLead()!.contractSigned || false" (ngModelChange)="updateField('contractSigned', $event)">
                      <span>{{ selectedLead()!.contractSigned ? 'تم توقيع العقد ✓' : 'لم يتم التوقيع بعد' }}</span>
                    </label>
                    @if (selectedLead()!.contractSigned) { <div class="form-group" style="margin-top:0.5rem"><label>تاريخ التوقيع</label><input type="date" class="dga-input" [ngModel]="selectedLead()!.contractDate || ''" (ngModelChange)="updateField('contractDate', $event)"></div> }
                  </div>
                  <div class="info-card"><h4><i class="bi bi-shield-lock"></i> الوكالة الشرعية (ناجز)</h4>
                    <div class="form-group"><label>رقم الوكالة</label><input class="dga-input" dir="ltr" placeholder="مثال: POA-44512" [ngModel]="selectedLead()!.poaNumber || ''" (ngModelChange)="updateField('poaNumber', $event)"></div>
                    <div class="form-group"><label>تاريخ انتهاء الوكالة</label><input type="date" class="dga-input" [ngModel]="selectedLead()!.poaExpiry || ''" (ngModelChange)="updateField('poaExpiry', $event)"></div>
                  </div>
                  <div class="info-card"><h4><i class="bi bi-cash"></i> الدفعة الأولى</h4>
                    <label class="toggle-option" [class.checked]="selectedLead()!.initialPaymentReceived === true">
                      <input type="checkbox" [ngModel]="selectedLead()!.initialPaymentReceived || false" (ngModelChange)="updateField('initialPaymentReceived', $event)">
                      <span>{{ selectedLead()!.initialPaymentReceived ? 'تم استلام الدفعة ✓' : 'لم يتم الاستلام بعد' }}</span>
                    </label>
                    @if (selectedLead()!.initialPaymentReceived) { <div class="form-group" style="margin-top:0.5rem"><label>المبلغ (ريال)</label><input type="number" class="dga-input" dir="ltr" [ngModel]="selectedLead()!.initialPaymentAmount || 0" (ngModelChange)="updateField('initialPaymentAmount', $event)"></div> }
                  </div>
                  <div class="engagement-checklist"><h4>قائمة التحقق للتحويل</h4>
                    <div class="checklist-item" [class.done]="selectedLead()!.contractSigned"><i class="bi" [class]="selectedLead()!.contractSigned ? 'bi-check-circle-fill' : 'bi-circle'"></i> توقيع عقد الأتعاب</div>
                    <div class="checklist-item" [class.done]="selectedLead()!.poaNumber"><i class="bi" [class]="selectedLead()!.poaNumber ? 'bi-check-circle-fill' : 'bi-circle'"></i> إصدار الوكالة الشرعية</div>
                    <div class="checklist-item" [class.done]="selectedLead()!.initialPaymentReceived"><i class="bi" [class]="selectedLead()!.initialPaymentReceived ? 'bi-check-circle-fill' : 'bi-circle'"></i> استلام الدفعة الأولى</div>
                    @if (selectedLead()!.contractSigned && selectedLead()!.poaNumber) {
                      <button class="btn-primary full" style="margin-top:1rem" (click)="convertToCase(selectedLead()!)"><i class="bi bi-briefcase-fill"></i> فتح ملف القضية</button>
                    }
                  </div>
                </div>
              }
            </div>
          </div></div>
        }

        <!-- ADD DIALOG -->
        @if (showAddDialog()) {
          <div class="tmk-overlay" (click)="showAddDialog.set(false)"><div class="tmk-modal wizard-modal" (click)="$event.stopPropagation()">
            <div class="modal-header"><h3><i class="bi bi-person-plus-fill"></i> طلب استقبال جديد</h3><button class="modal-close" (click)="showAddDialog.set(false)"><i class="bi bi-x-lg"></i></button></div>
            <div class="modal-body">
              <div class="form-row"><div class="form-group"><label>الاسم <span class="req">*</span></label><input [(ngModel)]="addForm.name" class="dga-input" placeholder="اسم العميل"></div><div class="form-group"><label>الجوال <span class="req">*</span></label><input [(ngModel)]="addForm.phone" class="dga-input" dir="ltr" placeholder="05xxxxxxxx"></div></div>
              <div class="form-row"><div class="form-group"><label>النوع</label><select [(ngModel)]="addForm.type" class="dga-select"><option value="individual">فرد</option><option value="corporate">شركة</option></select></div><div class="form-group"><label>المصدر</label><select [(ngModel)]="addForm.source" class="dga-select">@for (s of sourceOptions; track s.value) { <option [value]="s.value">{{ s.label }}</option> }</select></div></div>
              <div class="form-row"><div class="form-group"><label>نوع القضية</label><select [(ngModel)]="addForm.legalIssueType" class="dga-select"><option value="">— اختر —</option>@for (t of legalIssueTypes; track t.value) { <option [value]="t.value">{{ t.label }}</option> }</select></div><div class="form-group"><label>الإلحاح</label><select [(ngModel)]="addForm.urgencyLevel" class="dga-select"><option value="normal">عادي</option><option value="urgent">عاجل</option><option value="critical">حرج</option></select></div></div>
              <div class="form-group"><label>وصف المشكلة القانونية</label><textarea [(ngModel)]="addForm.issueDescription" class="dga-textarea" rows="3" placeholder="وصف مختصر..."></textarea></div>
              <div class="form-group"><label>إسناد إلى</label><select [(ngModel)]="addForm.assignedTo" class="dga-select"><option value="">— بدون إسناد —</option>@for (emp of store.employees(); track emp.id) { <option [value]="emp.id">{{ emp.name }}</option> }</select></div>
            </div>
            <div class="modal-footer"><button class="btn-outline" (click)="showAddDialog.set(false)">إلغاء</button><button class="btn-primary" (click)="submitAdd()" [disabled]="!addForm.name || !addForm.phone"><i class="bi bi-check-lg"></i> حفظ</button></div>
          </div></div>
        }

        <!-- COMM DIALOG -->
        @if (showCommDialog()) {
          <div class="tmk-overlay" (click)="showCommDialog.set(false)"><div class="tmk-modal wizard-modal" (click)="$event.stopPropagation()">
            <div class="modal-header"><h3><i class="bi bi-telephone-plus-fill"></i> تسجيل تواصل</h3><button class="modal-close" (click)="showCommDialog.set(false)"><i class="bi bi-x-lg"></i></button></div>
            <div class="modal-body">
              <div class="form-group"><label>نوع التواصل</label><div class="comm-type-grid">@for (t of commTypes; track t.value) { <label class="role-option" [class.selected]="commForm.type === t.value"><input type="radio" [(ngModel)]="commForm.type" [value]="t.value" hidden><i class="bi" [class]="t.icon"></i><span>{{ t.label }}</span></label> }</div></div>
              <div class="form-group"><label>ملخص <span class="req">*</span></label><textarea [(ngModel)]="commForm.summary" class="dga-textarea" rows="3"></textarea></div>
              <div class="form-group"><label>النتيجة</label><select [(ngModel)]="commForm.outcome" class="dga-select"><option value="">اختر...</option><option value="مهتم">مهتم — يحتاج متابعة</option><option value="جاهز">جاهز للاستشارة</option><option value="غير مهتم">غير مهتم</option></select></div>
            </div>
            <div class="modal-footer"><button class="btn-outline" (click)="showCommDialog.set(false)">إلغاء</button><button class="btn-primary" (click)="submitComm()" [disabled]="!commForm.summary">حفظ</button></div>
          </div></div>
        }

        <!-- PROPOSAL DIALOG -->
        @if (showProposalDialog()) {
          <div class="tmk-overlay" (click)="showProposalDialog.set(false)"><div class="tmk-modal wizard-modal" (click)="$event.stopPropagation()" style="max-width:700px">
            <div class="modal-header"><h3><i class="bi bi-file-earmark-plus-fill"></i> عرض أتعاب</h3><button class="modal-close" (click)="showProposalDialog.set(false)"><i class="bi bi-x-lg"></i></button></div>
            <div class="modal-body">
              <div class="form-group"><label>قوالب سريعة</label><div class="template-chips">@for (t of serviceTemplates; track t.label) { <button class="chip" (click)="addProposalTemplate(t)">{{ t.label }}</button> }</div></div>
              <div class="form-group"><div class="items-header"><label>بنود الأتعاب</label><button class="add-item-btn" (click)="addProposalItem()"><i class="bi bi-plus-lg"></i> إضافة بند</button></div>
                @for (item of proposalItems; track $index) {
                  <div class="proposal-item-row"><input [(ngModel)]="item.description" placeholder="وصف الخدمة" class="dga-input item-desc"><input type="number" [(ngModel)]="item.quantity" class="dga-input item-qty" dir="ltr" min="1"><input type="number" [(ngModel)]="item.unitPrice" placeholder="السعر" class="dga-input item-price" dir="ltr"><span class="item-total">{{ fmtCurrency(item.quantity * item.unitPrice) }}</span>@if (proposalItems.length > 1) { <button class="remove-item" (click)="removeProposalItem($index)"><i class="bi bi-x-lg"></i></button> }</div>
                }
              </div>
              <div class="proposal-totals"><div class="pt-row"><span>المجموع</span><span>{{ fmtCurrency(proposalSubtotal()) }}</span></div><div class="pt-row"><span>ضريبة (15%)</span><span>{{ fmtCurrency(proposalSubtotal() * 0.15) }}</span></div><div class="pt-row total"><span>الإجمالي</span><strong>{{ fmtCurrency(proposalSubtotal() * 1.15) }}</strong></div></div>
            </div>
            <div class="modal-footer"><button class="btn-outline" (click)="showProposalDialog.set(false)">إلغاء</button><button class="btn-primary" (click)="submitProposal()"><i class="bi bi-send-fill"></i> إنشاء العرض</button></div>
          </div></div>
        }

        <!-- DECLINE DIALOG -->
        @if (showDeclineDialog()) {
          <div class="tmk-overlay" (click)="showDeclineDialog.set(false)"><div class="tmk-modal wizard-modal" (click)="$event.stopPropagation()">
            <div class="modal-header"><h3><i class="bi bi-x-circle"></i> اعتذار / انسحاب</h3><button class="modal-close" (click)="showDeclineDialog.set(false)"><i class="bi bi-x-lg"></i></button></div>
            <div class="modal-body">
              <div class="form-group"><label>نوع الإنهاء</label><div class="comm-type-grid">
                <label class="role-option" [class.selected]="declineType() === 'declined'"><input type="radio" [value]="'declined'" [ngModel]="declineType()" (ngModelChange)="declineType.set($event)" hidden><i class="bi bi-x-circle" style="color:#dc2626"></i><span>اعتذار المكتب</span></label>
                <label class="role-option" [class.selected]="declineType() === 'withdrawn'"><input type="radio" [value]="'withdrawn'" [ngModel]="declineType()" (ngModelChange)="declineType.set($event)" hidden><i class="bi bi-dash-circle" style="color:#9ca3af"></i><span>انسحاب العميل</span></label>
              </div></div>
              <div class="form-group"><label>السبب <span class="req">*</span></label><select class="dga-select" [(ngModel)]="declineReason">
                @if (declineType() === 'declined') { <option value="">— اختر —</option><option value="تعارض مصالح">تعارض مصالح</option><option value="خارج تخصص المكتب">خارج تخصص المكتب</option><option value="ضعف الجدوى">ضعف الجدوى القانونية</option><option value="عدم توفر المحامين">عدم توفر المحامين</option><option value="أخرى">أخرى</option> }
                @else { <option value="">— اختر —</option><option value="عدم الموافقة على الأتعاب">عدم الموافقة على الأتعاب</option><option value="تم حل النزاع">تم حل النزاع ودياً</option><option value="التوكيل لمكتب آخر">التوكيل لمكتب آخر</option><option value="عدم الرد">عدم الرد</option><option value="أخرى">أخرى</option> }
              </select></div>
              <div class="form-group"><label>ملاحظات</label><textarea [(ngModel)]="declineNotes" class="dga-textarea" rows="3"></textarea></div>
            </div>
            <div class="modal-footer"><button class="btn-outline" (click)="showDeclineDialog.set(false)">إلغاء</button><button class="btn-danger" (click)="submitDecline()" [disabled]="!declineReason"><i class="bi bi-x-lg"></i> {{ declineType() === 'declined' ? 'تأكيد الاعتذار' : 'تأكيد الانسحاب' }}</button></div>
          </div></div>
        }
      </div>
    </app-dashboard-layout>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap');
    :host { --tmk-primary: #1B8354; --tmk-primary-light: #DFF6E7; }
    .dga-page { font-family: 'Tajawal', sans-serif; padding: 1.5rem; max-width: 1400px; margin: 0 auto; }
    .dga-breadcrumb { display: flex; align-items: center; gap: 0.5rem; font-size: 0.8rem; margin-bottom: 0.75rem; color: var(--text-secondary); }
    .dga-breadcrumb a { color: var(--tmk-primary); text-decoration: none; }
    .dga-page-title { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; }
    .dga-page-title h1 { font-size: 1.6rem; font-weight: 800; margin: 0; }
    .back-link { color: var(--tmk-primary); text-decoration: none; font-size: 0.85rem; }
    .flow-banner { background: var(--card-bg, #fff); border: 1px solid rgba(0,0,0,0.08); border-radius: 12px; padding: 1.25rem 1.5rem; margin-bottom: 1.25rem; overflow-x: auto; }
    .flow-steps { display: flex; align-items: center; gap: 0.5rem; min-width: max-content; }
    .flow-step { display: flex; align-items: center; gap: 0.6rem; }
    .fs-icon { width: 2.2rem; height: 2.2rem; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1rem; flex-shrink: 0; }
    .fs-info strong { display: block; font-size: 0.85rem; font-weight: 700; }
    .fs-info small { font-size: 0.7rem; color: var(--text-secondary); white-space: nowrap; }
    .fs-arrow { color: var(--text-muted); font-size: 0.9rem; padding: 0 0.3rem; }
    .dga-layout { display: grid; grid-template-columns: 1fr 280px; gap: 1.25rem; }
    @media (max-width: 1024px) { .dga-layout { grid-template-columns: 1fr; } }
    .dga-content-card { background: var(--card-bg, #fff); border-radius: 12px; border: 1px solid rgba(0,0,0,0.08); overflow: hidden; }
    .search-header { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 1.5rem; border-bottom: 1px solid rgba(0,0,0,0.06); }
    .search-title { display: flex; align-items: center; gap: 0.5rem; font-weight: 700; font-size: 1rem; }
    .search-title i { color: var(--tmk-primary); }
    .header-right { display: flex; align-items: center; gap: 1rem; }
    .case-count { background: rgba(0,0,0,0.04); padding: 0.3rem 0.75rem; border-radius: 8px; font-size: 0.8rem; font-weight: 600; }
    .view-toggle { display: flex; border: 1px solid rgba(0,0,0,0.1); border-radius: 6px; overflow: hidden; }
    .view-toggle button { padding: 0.35rem 0.65rem; border: none; background: transparent; cursor: pointer; font-size: 0.85rem; color: var(--text-secondary); }
    .view-toggle button.active { background: var(--tmk-primary); color: white; }
    .search-bar { padding: 1rem 1.5rem; }
    .search-input-wrap { position: relative; }
    .search-input { width: 100%; padding: 0.75rem 1rem 0.75rem 2.5rem; border: 1px solid rgba(0,0,0,0.12); border-radius: 8px; font-family: inherit; font-size: 0.9rem; background: var(--card-bg, #fff); box-sizing: border-box; }
    .search-input:focus { outline: none; border-color: var(--tmk-primary); box-shadow: 0 0 0 3px rgba(27,131,84,0.1); }
    .search-icon { position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); color: var(--text-secondary); }
    .filters-row { display: flex; justify-content: space-between; align-items: center; padding: 0 1.5rem 1rem; gap: 1rem; flex-wrap: wrap; }
    .sort-label { display: flex; align-items: center; gap: 0.4rem; font-size: 0.8rem; color: var(--text-secondary); background: rgba(0,0,0,0.03); padding: 0.4rem 0.75rem; border-radius: 6px; }
    .filter-chips { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .filter-chip { padding: 0.4rem 0.75rem; border: 1px solid rgba(0,0,0,0.1); border-radius: 6px; background: var(--card-bg, #fff); font-family: inherit; font-size: 0.8rem; cursor: pointer; }
    .clear-filter-btn { padding: 0.4rem 0.75rem; border: 1px solid rgba(220,38,38,0.2); border-radius: 6px; background: rgba(220,38,38,0.05); color: #dc2626; cursor: pointer; font-family: inherit; font-size: 0.8rem; display: flex; align-items: center; gap: 0.3rem; }
    .kanban-board { display: flex; gap: 0.75rem; overflow-x: auto; padding: 1rem 1.5rem 1.5rem; }
    .kanban-col { min-width: 220px; flex: 1; display: flex; flex-direction: column; }
    .kanban-header { padding: 0.65rem 0.85rem; background: var(--card-bg, #fff); border-top: 3px solid; border-radius: 8px 8px 0 0; display: flex; justify-content: space-between; align-items: center; font-weight: 700; font-size: 0.82rem; border: 1px solid rgba(0,0,0,0.06); border-bottom: none; }
    .kh-left { display: flex; align-items: center; gap: 0.4rem; }
    .kh-left i { font-size: 0.75rem; }
    .kanban-count { background: rgba(0,0,0,0.06); padding: 0.1rem 0.4rem; border-radius: 8px; font-size: 0.7rem; }
    .kanban-body { background: rgba(0,0,0,0.015); border: 1px solid rgba(0,0,0,0.06); border-top: none; border-radius: 0 0 8px 8px; padding: 0.5rem; min-height: 180px; flex: 1; transition: all 0.2s; }
    .kanban-body.drag-over { background: rgba(27,131,84,0.06); border-color: rgba(27,131,84,0.3); border-style: dashed; }
    .kanban-card { background: var(--card-bg, #fff); border: 1px solid rgba(0,0,0,0.06); border-radius: 8px; padding: 0.75rem; margin-bottom: 0.5rem; cursor: grab; transition: all 0.2s; }
    .kanban-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.06); transform: translateY(-1px); }
    .kanban-card:active { cursor: grabbing; }
    .kanban-card.dragging { opacity: 0.4; transform: rotate(2deg); }
    .kcard-top { display: flex; justify-content: space-between; align-items: center; }
    .kcard-top strong { font-size: 0.82rem; }
    .kcard-top i { color: var(--text-muted); font-size: 0.8rem; }
    .kcard-type { font-size: 0.72rem; color: var(--text-secondary); margin: 0.2rem 0 0; display: flex; align-items: center; gap: 0.3rem; }
    .kcard-type i { font-size: 0.65rem; }
    .urgency-dot { width: 6px; height: 6px; border-radius: 50%; background: #d97706; display: inline-block; margin-right: 0.2rem; }
    .urgency-dot.critical { background: #dc2626; animation: pulse 1.5s infinite; }
    @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
    .kcard-checks { display: flex; flex-direction: column; gap: 0.2rem; margin-top: 0.35rem; }
    .kcard-checks span { font-size: 0.68rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.25rem; }
    .kcard-checks span.done { color: var(--tmk-primary); }
    .kcard-checks span i { font-size: 0.6rem; }
    .merit-badge { padding: 0.1rem 0.4rem; border-radius: 4px; font-size: 0.65rem !important; font-weight: 600; }
    .merit-strong { background: rgba(5,150,105,0.1); color: #059669; }
    .merit-moderate { background: rgba(217,119,6,0.1); color: #d97706; }
    .merit-weak { background: rgba(220,38,38,0.1); color: #dc2626; }
    .merit-undetermined { background: rgba(107,114,128,0.1); color: #6b7280; }
    .kcard-assignee { display: flex; align-items: center; gap: 0.35rem; font-size: 0.7rem; color: var(--text-secondary); margin-top: 0.35rem; }
    .kcard-avatar { width: 1.15rem; height: 1.15rem; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 0.5rem; font-weight: 700; }
    .kcard-footer { display: flex; justify-content: space-between; margin-top: 0.4rem; font-size: 0.72rem; }
    .kcard-amount { color: var(--tmk-primary); font-weight: 700; }
    .kcard-cfee { color: #2563eb; font-weight: 600; }
    .kcard-date { color: var(--text-secondary); display: flex; align-items: center; gap: 0.2rem; }
    .kanban-empty { text-align: center; padding: 1.5rem 0.5rem; color: var(--text-muted); font-size: 0.8rem; display: flex; flex-direction: column; align-items: center; gap: 0.25rem; }
    .kanban-empty i { font-size: 1.25rem; }
    .leads-table-wrap { overflow-x: auto; }
    .tmk-table { width: 100%; border-collapse: collapse; }
    .tmk-table th { padding: 0.85rem 1rem; text-align: right; font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); background: rgba(0,0,0,0.02); border-bottom: 1px solid rgba(0,0,0,0.08); }
    .tmk-table td { padding: 0.85rem 1rem; border-bottom: 1px solid rgba(0,0,0,0.04); font-size: 0.9rem; }
    .lead-row { cursor: pointer; transition: background 0.15s; }
    .lead-row:hover { background: rgba(27,131,84,0.03); }
    .lead-name-cell { display: flex; align-items: center; gap: 0.75rem; }
    .lead-avatar { width: 2.25rem; height: 2.25rem; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 0.9rem; flex-shrink: 0; }
    .lead-name-cell strong { display: block; font-size: 0.9rem; }
    .lead-name-cell small { font-size: 0.75rem; color: var(--text-secondary); }
    .status-badge { display: inline-flex; align-items: center; gap: 0.3rem; padding: 0.2rem 0.65rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600; border: 1px solid; }
    .status-badge.large { padding: 0.3rem 0.85rem; font-size: 0.8rem; }
    .status-badge i { font-size: 0.65rem; }
    .issue-tag { font-size: 0.8rem; background: rgba(27,131,84,0.06); padding: 0.15rem 0.5rem; border-radius: 4px; color: var(--tmk-primary); font-weight: 600; }
    .assignee-badge { display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.85rem; }
    .assignee-dot { display: inline-flex; align-items: center; justify-content: center; width: 1.5rem; height: 1.5rem; border-radius: 50%; color: white; font-size: 0.6rem; font-weight: 700; }
    .amount-text { color: var(--tmk-primary); }
    .muted { color: var(--text-muted); }
    .overdue { color: #dc2626 !important; font-weight: 600; }
    .view-btn { padding: 0.35rem 0.75rem; border: 1px solid rgba(27,131,84,0.2); border-radius: 6px; background: transparent; color: var(--tmk-primary); cursor: pointer; font-family: inherit; font-size: 0.8rem; }
    .empty-row { text-align: center; padding: 3rem !important; color: var(--text-secondary); }
    .dga-sidebar { display: flex; flex-direction: column; gap: 1rem; }
    .sidebar-card { background: var(--card-bg, #fff); border-radius: 12px; border: 1px solid rgba(0,0,0,0.08); padding: 1.25rem; }
    .sidebar-header-card { padding: 1.5rem; }
    .sidebar-title { display: flex; align-items: center; gap: 0.75rem; font-size: 1.15rem; font-weight: 700; }
    .sidebar-title i { color: var(--tmk-primary); font-size: 1.25rem; }
    .sidebar-section-title { display: flex; align-items: center; gap: 0.5rem; font-size: 0.9rem; font-weight: 600; margin-bottom: 1rem; padding-bottom: 0.75rem; border-bottom: 1px solid rgba(0,0,0,0.06); }
    .sidebar-section-title i { color: var(--tmk-primary); }
    .sidebar-item { display: flex; justify-content: space-between; align-items: center; padding: 0.55rem 0.75rem; border-radius: 6px; cursor: pointer; font-size: 0.85rem; transition: all 0.15s; }
    .sidebar-item:hover { background: rgba(0,0,0,0.03); }
    .sidebar-item.selected { background: rgba(27,131,84,0.06); color: var(--tmk-primary); font-weight: 600; }
    .si-left { display: flex; align-items: center; gap: 0.5rem; }
    .si-dot { width: 8px; height: 8px; border-radius: 50%; }
    .item-count { font-weight: 700; color: var(--text-secondary); font-size: 0.8rem; }
    .pipeline-value { text-align: center; padding: 0.5rem 0; }
    .pv-amount { font-size: 1.5rem; font-weight: 800; color: var(--tmk-primary); display: block; }
    .pipeline-value small { font-size: 0.75rem; color: var(--text-secondary); }
    .quick-stat-row { display: flex; justify-content: space-between; padding: 0.5rem 0; font-size: 0.85rem; border-bottom: 1px solid rgba(0,0,0,0.04); }
    .quick-stat-row:last-child { border-bottom: none; }
    .quick-stat-row strong { color: var(--tmk-primary); }
    .sidebar-add-btn { display: flex; align-items: center; justify-content: center; gap: 0.5rem; width: 100%; padding: 0.85rem; border: 2px dashed rgba(27,131,84,0.3); border-radius: 12px; background: rgba(27,131,84,0.03); color: var(--tmk-primary); font-family: inherit; font-size: 0.9rem; font-weight: 600; cursor: pointer; }
    .tmk-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .drag-confirm-modal { background: var(--card-bg, #fff); border-radius: 16px; padding: 2rem; text-align: center; max-width: 400px; width: 90%; }
    .dcm-icon { width: 3.5rem; height: 3.5rem; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; margin: 0 auto 1rem; }
    .dcm-actions { display: flex; gap: 0.75rem; justify-content: center; margin-top: 1.5rem; }
    .panel-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.3); z-index: 900; display: flex; justify-content: flex-start; }
    .detail-panel { width: 480px; max-width: 90vw; height: 100vh; background: var(--card-bg, #fff); overflow-y: auto; box-shadow: -4px 0 24px rgba(0,0,0,0.12); }
    .panel-header { display: flex; justify-content: space-between; align-items: center; padding: 1.5rem; border-bottom: 1px solid rgba(0,0,0,0.06); }
    .panel-lead-info { display: flex; align-items: center; gap: 0.75rem; }
    .panel-avatar { width: 3rem; height: 3rem; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 1.25rem; }
    .panel-lead-info h2 { font-size: 1.15rem; margin: 0; }
    .panel-lead-info span { font-size: 0.8rem; color: var(--text-secondary); }
    .close-panel { border: none; background: none; font-size: 1.25rem; cursor: pointer; color: var(--text-secondary); padding: 0.5rem; }
    .panel-status { padding: 1rem 1.5rem; border-bottom: 1px solid rgba(0,0,0,0.06); display: flex; align-items: center; gap: 0.75rem; }
    .panel-status small { color: var(--text-secondary); font-size: 0.8rem; }
    .panel-tabs { display: flex; border-bottom: 1px solid rgba(0,0,0,0.06); overflow-x: auto; }
    .panel-tabs button { padding: 0.75rem 1rem; border: none; background: none; font-family: inherit; font-size: 0.8rem; cursor: pointer; white-space: nowrap; color: var(--text-secondary); border-bottom: 2px solid transparent; }
    .panel-tabs button.active { color: var(--tmk-primary); border-bottom-color: var(--tmk-primary); font-weight: 600; }
    .panel-content { padding: 1.5rem; }
    .tab-content { display: flex; flex-direction: column; gap: 1rem; }
    .info-card { background: rgba(0,0,0,0.02); border-radius: 10px; padding: 1rem; }
    .info-card h4 { font-size: 0.85rem; font-weight: 700; margin: 0 0 0.75rem; display: flex; align-items: center; gap: 0.4rem; }
    .info-card h4 i { color: var(--tmk-primary); }
    .info-row { display: flex; justify-content: space-between; padding: 0.4rem 0; font-size: 0.85rem; border-bottom: 1px solid rgba(0,0,0,0.04); }
    .info-row:last-child { border-bottom: none; }
    .issue-desc { font-size: 0.85rem; color: var(--text-secondary); margin: 0.5rem 0 0; line-height: 1.6; }
    .urgency-label { padding: 0.15rem 0.5rem; border-radius: 4px; font-size: 0.8rem; font-weight: 600; }
    .urgency-normal { background: rgba(107,114,128,0.1); color: #6b7280; }
    .urgency-urgent { background: rgba(217,119,6,0.1); color: #d97706; }
    .urgency-critical { background: rgba(220,38,38,0.1); color: #dc2626; }
    .quick-contact { display: flex; gap: 0.5rem; }
    .qc-btn { flex: 1; padding: 0.6rem; border: 1px solid rgba(0,0,0,0.1); border-radius: 8px; background: var(--card-bg, #fff); font-family: inherit; font-size: 0.85rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.4rem; }
    .qc-btn.whatsapp { border-color: rgba(37,211,102,0.3); color: #25d366; }
    .toggle-option { display: flex; align-items: center; gap: 0.6rem; padding: 0.6rem 0.75rem; border-radius: 8px; border: 1px solid rgba(0,0,0,0.1); cursor: pointer; font-size: 0.85rem; }
    .toggle-option.checked { border-color: rgba(27,131,84,0.3); background: rgba(27,131,84,0.05); color: var(--tmk-primary); font-weight: 600; }
    .toggle-option input[type="checkbox"] { accent-color: var(--tmk-primary); }
    .merit-options, .complexity-options { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem; margin-bottom: 0.75rem; }
    .role-option { display: flex; align-items: center; gap: 0.5rem; padding: 0.6rem 0.75rem; border: 1px solid rgba(0,0,0,0.1); border-radius: 8px; cursor: pointer; font-size: 0.8rem; }
    .role-option.selected { border-color: rgba(27,131,84,0.4); background: rgba(27,131,84,0.06); color: var(--tmk-primary); font-weight: 600; }
    .engagement-checklist { background: rgba(0,0,0,0.02); border-radius: 10px; padding: 1rem; }
    .engagement-checklist h4 { font-size: 0.85rem; font-weight: 700; margin: 0 0 0.75rem; }
    .checklist-item { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0; font-size: 0.85rem; color: var(--text-secondary); border-bottom: 1px solid rgba(0,0,0,0.04); }
    .checklist-item:last-of-type { border-bottom: none; }
    .checklist-item.done { color: var(--tmk-primary); font-weight: 600; }
    .convert-card { background: rgba(5,150,105,0.06); border: 1px solid rgba(5,150,105,0.2); border-radius: 10px; padding: 1rem; }
    .convert-card h4 { margin: 0 0 0.5rem; font-size: 0.85rem; display: flex; align-items: center; gap: 0.4rem; color: #059669; }
    .convert-card p { font-size: 0.8rem; color: var(--text-secondary); margin: 0 0 0.5rem; }
    .warning-card { display: flex; align-items: flex-start; gap: 0.75rem; background: rgba(217,119,6,0.06); border: 1px solid rgba(217,119,6,0.2); border-radius: 10px; padding: 1rem; }
    .warning-card i { color: #d97706; font-size: 1.25rem; flex-shrink: 0; }
    .warning-card strong { display: block; font-size: 0.85rem; color: #d97706; }
    .warning-card p { font-size: 0.8rem; color: var(--text-secondary); margin: 0.25rem 0 0; }
    .pipeline-progress { display: flex; align-items: flex-start; margin: 0.75rem 0; overflow-x: auto; }
    .pipe-step { display: flex; flex-direction: column; align-items: center; position: relative; flex: 1; min-width: 60px; }
    .pipe-dot { width: 12px; height: 12px; border-radius: 50%; border: 2px solid #d1d5db; background: white; z-index: 1; }
    .pipe-step.active .pipe-dot { border-color: transparent; }
    .pipe-step.current .pipe-dot { transform: scale(1.3); box-shadow: 0 0 0 3px rgba(27,131,84,0.2); }
    .pipe-label { font-size: 0.65rem; margin-top: 0.3rem; text-align: center; color: var(--text-muted); }
    .pipe-step.active .pipe-label { color: var(--text-primary); font-weight: 600; }
    .pipe-line { position: absolute; top: 6px; right: 50%; width: 100%; height: 2px; z-index: 0; }
    .pipe-actions { display: flex; gap: 0.5rem; margin-top: 0.5rem; }
    .proposal-card { background: rgba(0,0,0,0.02); border-radius: 10px; padding: 1rem; }
    .proposal-card h4 { margin: 0 0 0.75rem; font-size: 0.85rem; display: flex; align-items: center; gap: 0.4rem; }
    .proposal-card h4 i { color: var(--tmk-primary); }
    .proposal-item { display: flex; justify-content: space-between; padding: 0.4rem 0; border-bottom: 1px solid rgba(0,0,0,0.04); font-size: 0.85rem; }
    .proposal-total { display: flex; justify-content: space-between; padding: 0.6rem 0 0; font-size: 0.9rem; border-top: 2px solid rgba(0,0,0,0.08); margin-top: 0.3rem; }
    .btn-primary { padding: 0.55rem 1.25rem; background: var(--tmk-primary); color: white; border: none; border-radius: 8px; font-family: inherit; font-size: 0.85rem; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 0.4rem; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-primary.full { width: 100%; justify-content: center; }
    .btn-primary.compact { padding: 0.4rem 0.85rem; font-size: 0.8rem; margin-bottom: 0.75rem; }
    .btn-outline { padding: 0.55rem 1.25rem; background: transparent; border: 1px solid rgba(0,0,0,0.15); border-radius: 8px; font-family: inherit; font-size: 0.85rem; cursor: pointer; display: inline-flex; align-items: center; gap: 0.4rem; }
    .btn-outline.danger { border-color: rgba(220,38,38,0.3); color: #dc2626; }
    .btn-danger { padding: 0.55rem 1.25rem; background: #dc2626; color: white; border: none; border-radius: 8px; font-family: inherit; font-size: 0.85rem; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 0.4rem; }
    .btn-danger:disabled { opacity: 0.5; cursor: not-allowed; }
    .form-group { margin-bottom: 0.75rem; }
    .form-group label { display: block; font-size: 0.8rem; font-weight: 600; margin-bottom: 0.3rem; }
    .req { color: #dc2626; }
    .dga-input, .dga-select, .dga-textarea { width: 100%; padding: 0.6rem 0.75rem; border: 1px solid rgba(0,0,0,0.12); border-radius: 8px; font-family: inherit; font-size: 0.85rem; background: var(--card-bg, #fff); box-sizing: border-box; }
    .dga-input:focus, .dga-select:focus, .dga-textarea:focus { outline: none; border-color: var(--tmk-primary); box-shadow: 0 0 0 3px rgba(27,131,84,0.1); }
    .dga-textarea { resize: vertical; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
    .form-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
    .empty-note { font-size: 0.8rem; color: var(--text-muted); text-align: center; padding: 1rem 0; }
    .tmk-modal { background: var(--card-bg, #fff); border-radius: 16px; max-width: 520px; width: 90%; max-height: 85vh; overflow-y: auto; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 1.5rem; border-bottom: 1px solid rgba(0,0,0,0.06); }
    .modal-header h3 { display: flex; align-items: center; gap: 0.5rem; font-size: 1rem; margin: 0; }
    .modal-close { border: none; background: none; font-size: 1.1rem; cursor: pointer; color: var(--text-secondary); }
    .modal-body { padding: 1.5rem; }
    .modal-footer { display: flex; justify-content: flex-end; gap: 0.75rem; padding: 1rem 1.5rem; border-top: 1px solid rgba(0,0,0,0.06); }
    .comm-type-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 0.5rem; }
    .comm-item { background: rgba(0,0,0,0.02); border-radius: 8px; padding: 0.75rem; margin-top: 0.5rem; }
    .comm-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.3rem; }
    .comm-type-badge { font-size: 0.7rem; padding: 0.1rem 0.5rem; background: rgba(27,131,84,0.08); color: var(--tmk-primary); border-radius: 4px; font-weight: 600; }
    .comm-item p { font-size: 0.8rem; margin: 0; color: var(--text-secondary); }
    .template-chips { display: flex; flex-wrap: wrap; gap: 0.4rem; }
    .chip { padding: 0.3rem 0.65rem; border: 1px solid rgba(27,131,84,0.2); border-radius: 6px; background: rgba(27,131,84,0.04); color: var(--tmk-primary); font-family: inherit; font-size: 0.75rem; cursor: pointer; }
    .items-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
    .add-item-btn { border: none; background: none; color: var(--tmk-primary); font-family: inherit; font-size: 0.8rem; cursor: pointer; display: flex; align-items: center; gap: 0.3rem; }
    .proposal-item-row { display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.5rem; }
    .item-desc { flex: 3; }
    .item-qty { flex: 0.5; min-width: 50px; }
    .item-price { flex: 1; min-width: 80px; }
    .item-total { flex: 1; text-align: left; font-weight: 700; font-size: 0.85rem; color: var(--tmk-primary); min-width: 80px; }
    .remove-item { border: none; background: none; color: #dc2626; cursor: pointer; padding: 0.4rem; }
    .proposal-totals { margin-top: 1rem; padding-top: 0.75rem; border-top: 2px solid rgba(0,0,0,0.08); }
    .pt-row { display: flex; justify-content: space-between; padding: 0.35rem 0; font-size: 0.85rem; }
    .pt-row.total { font-size: 1rem; border-top: 1px solid rgba(0,0,0,0.08); padding-top: 0.5rem; margin-top: 0.25rem; }
    :host-context([data-theme="dark"]) .dga-input, :host-context([data-theme="dark"]) .dga-select, :host-context([data-theme="dark"]) .dga-textarea { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.12); color: #e5e7eb; }
    :host-context([data-theme="dark"]) .kanban-card, :host-context([data-theme="dark"]) .info-card, :host-context([data-theme="dark"]) .comm-item { background: rgba(255,255,255,0.03); border-color: rgba(255,255,255,0.08); }
  `]
})
export class LeadsComponent {
  readonly store = inject(StoreService);
  viewMode = signal<ViewMode>('kanban');
  searchQuery = signal('');
  filterStatus = signal('');
  filterSource = signal('');
  selectedLead = signal<Lead | null>(null);
  panelTab = signal('overview');
  showAddDialog = signal(false);
  showCommDialog = signal(false);
  showProposalDialog = signal(false);
  showDragConfirm = signal(false);
  showDeclineDialog = signal(false);
  draggedLead = signal<Lead | null>(null);
  dragTargetStatus = signal('');
  declineType = signal<'declined' | 'withdrawn'>('declined');
  declineReason = '';
  declineNotes = '';

  statusFlow = STATUS_FLOW;
  legalIssueTypes = LEGAL_ISSUE_TYPES;
  sourceOptions = Object.entries(SOURCE_CONFIG).map(([value, cfg]) => ({ value, ...cfg }));
  commTypes = [
    { value: 'call', label: 'مكالمة', icon: 'bi-telephone-fill' },
    { value: 'whatsapp', label: 'واتساب', icon: 'bi-whatsapp' },
    { value: 'meeting', label: 'اجتماع', icon: 'bi-people-fill' },
    { value: 'email', label: 'بريد', icon: 'bi-envelope-fill' },
    { value: 'sms', label: 'رسالة', icon: 'bi-chat-dots-fill' },
  ];
  meritOptions = [
    { value: 'strong', label: 'قوية', icon: 'bi-arrow-up-circle-fill', color: '#059669' },
    { value: 'moderate', label: 'متوسطة', icon: 'bi-dash-circle-fill', color: '#d97706' },
    { value: 'weak', label: 'ضعيفة', icon: 'bi-arrow-down-circle-fill', color: '#dc2626' },
    { value: 'undetermined', label: 'غير محددة', icon: 'bi-question-circle-fill', color: '#6b7280' },
  ];
  complexityOptions = [
    { value: 'simple', label: 'بسيطة' },
    { value: 'moderate', label: 'متوسطة' },
    { value: 'complex', label: 'معقدة' },
  ];
  serviceTemplates = [
    { label: 'ترافع أمام محكمة الدرجة الأولى', price: 15000 },
    { label: 'ترافع أمام محكمة الاستئناف', price: 10000 },
    { label: 'استشارة قانونية', price: 500 },
    { label: 'صياغة عقد', price: 2000 },
    { label: 'مراجعة مستندات', price: 1000 },
    { label: 'تنفيذ حكم', price: 5000 },
    { label: 'صياغة لائحة دعوى', price: 3000 },
  ];

  addForm: any = { name: '', phone: '', email: '', type: 'individual', source: 'whatsapp', legalIssueType: '', issueDescription: '', urgencyLevel: 'normal', assignedTo: '' };
  commForm = { type: 'call', summary: '', outcome: '', nextAction: '' };
  proposalItems: { description: string; quantity: number; unitPrice: number }[] = [{ description: '', quantity: 1, unitPrice: 0 }];

  pipelineValue = computed(() => this.store.leads().filter(l => ['case_study', 'fee_proposal', 'engagement'].includes(l.status)).reduce((s, l) => s + (l.proposedAmount || 0), 0));
  pendingConsultation = computed(() => this.store.leads().filter(l => l.status === 'intake').length);
  pendingStudy = computed(() => this.store.leads().filter(l => l.status === 'consultation').length);
  pendingSigning = computed(() => this.store.leads().filter(l => l.status === 'fee_proposal').length);
  readyToConvert = computed(() => this.store.leads().filter(l => l.status === 'engagement' && l.contractSigned && l.poaNumber).length);

  pipelineStats = computed(() =>
    Object.entries(STATUS_CONFIG).map(([status, cfg]) => ({
      status, ...cfg, count: this.store.leads().filter(l => l.status === status).length,
    }))
  );

  filteredLeads = computed(() => {
    let leads = this.store.leads();
    const status = this.filterStatus(); if (status) leads = leads.filter(l => l.status === status);
    const src = this.filterSource(); if (src) leads = leads.filter(l => l.source === src);
    const q = this.searchQuery().toLowerCase(); if (q) leads = leads.filter(l => l.name.toLowerCase().includes(q) || l.phone.includes(q));
    return leads.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  });

  kanbanColumns = computed(() =>
    STATUS_FLOW.map(status => ({ status, ...STATUS_CONFIG[status], leads: this.filteredLeads().filter(l => l.status === status) }))
  );

  proposalSubtotal = computed(() => this.proposalItems.reduce((s, i) => s + (i.quantity * i.unitPrice), 0));

  fmtCurrency = formatCurrency; fmtRelative = formatRelativeDate;
  isOverdue(d: string) { return new Date(d) < new Date(); }
  getStatusConfig(s: string) { return STATUS_CONFIG[s] || STATUS_CONFIG['intake']; }
  getSourceConfig(s: string) { return SOURCE_CONFIG[s] || SOURCE_CONFIG['other']; }
  getStatusIndex(s: string) { return STATUS_FLOW.indexOf(s); }
  getNextStatus(s: string) { const i = STATUS_FLOW.indexOf(s); return i >= 0 && i < STATUS_FLOW.length - 1 ? STATUS_FLOW[i + 1] : null; }
  getCommTypeLabel(t: string) { return this.commTypes.find(c => c.value === t)?.label || t; }
  getMeritLabel(m: string) { return this.meritOptions.find(o => o.value === m)?.label || m; }
  getUrgencyLabel(u: string) { return u === 'normal' ? 'عادي' : u === 'urgent' ? 'عاجل' : u === 'critical' ? 'حرج' : u; }
  toggleFilter(status: string) { this.filterStatus.update(s => s === status ? '' : status); }
  clearFilters() { this.filterStatus.set(''); this.searchQuery.set(''); this.filterSource.set(''); }
  selectLead(lead: Lead) { this.selectedLead.set(lead); this.panelTab.set('overview'); }

  updateField(field: string, value: any) {
    if (!this.selectedLead()) return;
    this.store.updateLead(this.selectedLead()!.id, { [field]: value } as any);
    this.selectedLead.set(this.store.getLead(this.selectedLead()!.id) || null);
  }

  onDragStart(event: DragEvent, lead: Lead) { this.draggedLead.set(lead); (event.target as HTMLElement).classList.add('dragging'); event.dataTransfer?.setData('text/plain', lead.id); }
  onDragEnd(event: DragEvent) { (event.target as HTMLElement).classList.remove('dragging'); }
  onDragOver(event: DragEvent) { event.preventDefault(); (event.currentTarget as HTMLElement).classList.add('drag-over'); }
  onDragLeave(event: DragEvent) { (event.currentTarget as HTMLElement).classList.remove('drag-over'); }
  onDrop(event: DragEvent, targetStatus: string) {
    event.preventDefault(); (event.currentTarget as HTMLElement).classList.remove('drag-over');
    const lead = this.draggedLead();
    if (lead && lead.status !== targetStatus) { this.dragTargetStatus.set(targetStatus); this.showDragConfirm.set(true); }
  }
  confirmDrag() {
    const lead = this.draggedLead(); const target = this.dragTargetStatus();
    if (lead && target) { this.store.updateLead(lead.id, { status: target } as any); }
    this.showDragConfirm.set(false); this.draggedLead.set(null); this.dragTargetStatus.set('');
  }
  cancelDrag() { this.showDragConfirm.set(false); this.draggedLead.set(null); this.dragTargetStatus.set(''); }

  openWhatsApp(lead: Lead) { window.open(`https://wa.me/966${lead.phone.replace(/^0/, '')}`, '_blank'); }
  callLead(lead: Lead) { window.open(`tel:${lead.phone}`, '_self'); }

  changeLeadStatus(id: string, status: string) {
    this.store.updateLead(id, { status } as any);
    if (this.selectedLead()?.id === id) this.selectedLead.set(this.store.getLead(id) || null);
  }

  advanceStatus(lead: Lead) { const next = this.getNextStatus(lead.status); if (next) this.changeLeadStatus(lead.id, next); }

  convertToCase(lead: Lead) {
    const client = { id: this.store.generateId('CL'), name: lead.name, phone: lead.phone, email: lead.email || '', type: lead.type, idType: 'national_id' as any, idNumber: lead.idNumber || '', whatsappOptIn: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as any;
    const caseData = { id: this.store.generateId('CASE'), title: `قضية — ${lead.name}`, clientId: client.id, status: 'active', courtType: 'general' as any, caseCategory: lead.legalIssueType || '', caseSubCategory: '', partyRole: 'plaintiff' as any, opponents: [], agreedFee: lead.proposedAmount || 0, paidAmount: lead.initialPaymentAmount || 0, filingDate: new Date().toISOString().split('T')[0], leadId: lead.id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as any;
    this.store.convertLead(lead.id, client, caseData);
    this.selectedLead.set(null);
  }

  submitDecline() {
    if (!this.selectedLead() || !this.declineReason) return;
    const updates: any = { status: this.declineType() };
    if (this.declineType() === 'declined') { updates.declineReason = this.declineReason + (this.declineNotes ? ' — ' + this.declineNotes : ''); }
    else { updates.withdrawReason = this.declineReason + (this.declineNotes ? ' — ' + this.declineNotes : ''); }
    this.store.updateLead(this.selectedLead()!.id, updates);
    this.selectedLead.set(this.store.getLead(this.selectedLead()!.id) || null);
    this.showDeclineDialog.set(false); this.declineReason = ''; this.declineNotes = '';
  }

  openAddDialog() { this.showAddDialog.set(true); this.addForm = { name: '', phone: '', email: '', type: 'individual', source: 'whatsapp', legalIssueType: '', issueDescription: '', urgencyLevel: 'normal', assignedTo: '' }; }
  submitAdd() {
    if (!this.addForm.name || !this.addForm.phone) return;
    this.store.addLead({ id: this.store.generateId('LEAD'), name: this.addForm.name, phone: this.addForm.phone, email: this.addForm.email, type: this.addForm.type as any, status: 'intake', source: this.addForm.source as any, legalIssueType: this.addForm.legalIssueType, issueDescription: this.addForm.issueDescription, urgencyLevel: this.addForm.urgencyLevel, assignedTo: this.addForm.assignedTo || undefined, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as any);
    this.showAddDialog.set(false);
  }

  submitComm() {
    if (!this.selectedLead() || !this.commForm.summary) return;
    const lead = this.selectedLead()!;
    const entry = { id: `comm-${Date.now()}`, type: this.commForm.type, date: new Date().toISOString(), summary: this.commForm.summary, outcome: this.commForm.outcome, nextAction: this.commForm.nextAction };
    this.store.updateLead(lead.id, { communications: [...(lead.communications || []), entry] } as any);
    this.selectedLead.set(this.store.getLead(lead.id) || null);
    this.showCommDialog.set(false); this.commForm = { type: 'call', summary: '', outcome: '', nextAction: '' };
  }

  addProposalItem() { this.proposalItems.push({ description: '', quantity: 1, unitPrice: 0 }); }
  removeProposalItem(i: number) { this.proposalItems.splice(i, 1); }
  addProposalTemplate(t: { label: string; price: number }) {
    const empty = this.proposalItems.find(i => !i.description);
    if (empty) { empty.description = t.label; empty.unitPrice = t.price; } else { this.proposalItems.push({ description: t.label, quantity: 1, unitPrice: t.price }); }
  }
  submitProposal() {
    if (!this.selectedLead()) return;
    const total = this.proposalSubtotal() * 1.15;
    this.store.updateLead(this.selectedLead()!.id, { proposedAmount: total, proposalItems: this.proposalItems.filter(i => i.description) as any, status: 'fee_proposal' as any } as any);
    this.selectedLead.set(this.store.getLead(this.selectedLead()!.id) || null);
    this.showProposalDialog.set(false); this.proposalItems = [{ description: '', quantity: 1, unitPrice: 0 }];
  }

  createInvoiceFromProposal(lead: Lead) {
    if (!lead.proposedAmount) return;
    const subtotal = lead.proposedAmount / 1.15; const vat = subtotal * 0.15;
    const items = (lead as any).proposalItems?.map((pi: any) => ({ description: pi.description, quantity: pi.quantity, unitPrice: pi.unitPrice, amount: pi.quantity * pi.unitPrice, vatRate: 15, vatAmount: pi.quantity * pi.unitPrice * 0.15 })) || [{ description: 'أتعاب قانونية', quantity: 1, unitPrice: subtotal, amount: subtotal, vatRate: 15, vatAmount: vat }];
    this.store.addInvoice({ id: this.store.generateId('INV'), invoiceNumber: `INV-${new Date().getFullYear()}-${String(this.store.invoices().length + 1).padStart(3, '0')}`, clientId: '', subtotal, vatAmount: vat, total: lead.proposedAmount, status: 'issued', paidAmount: 0, issueDate: new Date().toISOString().split('T')[0], dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0], items, type: 'standard', zatcaCompliant: true, sellerVatNumber: '', sellerName: 'تمكين', buyerName: lead.name, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as any);
    alert('تم إنشاء الفاتورة بنجاح — يمكنك مراجعتها في قسم المالية');
  }

  private readonly ROLE_LABELS: Record<string, string> = { admin: 'مدير النظام', senior_lawyer: 'محامي أول', lawyer: 'محامي', paralegal: 'مساعد قانوني', secretary: 'سكرتير' };
  getEmployeeInitials(empId: string): string { const emp = this.store.employees().find(e => e.id === empId); if (!emp) return '?'; const p = emp.name.split(' '); return p.length >= 2 ? p[0].charAt(0) + p[1].charAt(0) : p[0].charAt(0); }
  getRoleLabel(role: string): string { return this.ROLE_LABELS[role] || role; }
  assignEmployee(leadId: string, empId: string) { this.store.updateLead(leadId, { assignedTo: empId || undefined } as any); this.selectedLead.set(this.store.getLead(leadId) || null); }
}
