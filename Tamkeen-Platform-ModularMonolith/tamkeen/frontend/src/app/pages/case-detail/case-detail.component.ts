import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DashboardLayoutComponent } from '../../layouts/dashboard/dashboard-layout.component';
import { StoreService } from '../../core/services/store.service';
import { AIEngineService } from '../../core/services/ai-engine.service';
import { formatCurrency, formatRelativeDate } from '../../core/utils/formatters';
import { SAUDI_COURTS } from '../../core/data/classifications';
import { AIActionPanelComponent, AIFindingsDisplayComponent, AIUsageWidgetComponent, AIAnalysisHistoryComponent } from '../../components/ai';
import { AIAnalysisResult, AIAnalysis, AIFinding } from '../../core/models/ai';

@Component({
  selector: 'app-case-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DashboardLayoutComponent, AIActionPanelComponent, AIFindingsDisplayComponent, AIUsageWidgetComponent, AIAnalysisHistoryComponent],
  template: `
    <app-dashboard-layout>
      <div class="dga-detail" dir="rtl">
        @if (!caseData()) {
          <div class="not-found">
            <i class="bi bi-exclamation-triangle"></i>
            <h2>القضية غير موجودة</h2>
            <p>لم يتم العثور على القضية المطلوبة أو تم حذفها.</p>
            <a routerLink="/cases" class="btn-primary">العودة لقائمة القضايا</a>
          </div>
        } @else {

          <!-- BREADCRUMB -->
          <nav class="dga-breadcrumb">
            <a routerLink="/home">إستعراض</a>
            <span class="sep">‹</span>
            <a routerLink="/cases">إدارة القضايا</a>
            <span class="sep">‹</span>
            <span>{{ caseData()!.title }}</span>
          </nav>

          <div class="page-title-row">
            <h1>{{ caseData()!.title }}</h1>
            <button class="exit-btn" routerLink="/cases">
              <i class="bi bi-x-lg"></i>
              خروج من الخدمة
            </button>
          </div>

          <!-- ═══ MAIN 3-COLUMN LAYOUT ═══ -->
          <div class="detail-layout">

            <!-- INFO SIDEBAR (renders LEFT in RTL via CSS order) -->
            <div class="info-sidebar">

              <!-- Other Data -->
              <div class="info-panel">
                <div class="panel-icon">
                  <i class="bi bi-grid"></i>
                </div>
                <h4>بيانات أخرى</h4>
              </div>

              <!-- Workflow -->
              <div class="info-panel">
                <div class="panel-header-row">
                  <div class="panel-header-icon">
                    <i class="bi bi-diagram-3"></i>
                  </div>
                  <span class="panel-title">مسار العمل</span>
                  <a class="panel-link" (click)="showWorkflow.set(!showWorkflow())">عرض التفاصيل</a>
                </div>
                <div class="workflow-badge" [class]="'wf-' + caseData()!.status">
                  مسار العمل : {{ getStatusLabel(caseData()!.status) }}
                </div>
                @if (showWorkflow()) {
                  <div class="workflow-detail">
                    <div class="wf-item">
                      <i class="bi bi-check-circle-fill text-success"></i>
                      <span>تسجيل القضية</span>
                    </div>
                    <div class="wf-item">
                      <i class="bi bi-check-circle-fill text-success"></i>
                      <span>فتح الملف</span>
                    </div>
                    @if (caseData()!.status === 'active') {
                      <div class="wf-item active">
                        <i class="bi bi-circle text-primary"></i>
                        <span>قيد المعالجة</span>
                      </div>
                    }
                    @if (caseData()!.status === 'closed') {
                      <div class="wf-item">
                        <i class="bi bi-check-circle-fill text-success"></i>
                        <span>تم الإغلاق</span>
                      </div>
                    }
                  </div>
                }
              </div>

              <!-- Lead Lawyer -->
              <div class="info-panel">
                <div class="panel-header-row">
                  <div class="panel-header-icon">
                    <i class="bi bi-person-badge"></i>
                  </div>
                  <span class="panel-title">المحامي الرئيسي</span>
                </div>
                @if (assignedEmployee()) {
                  <div class="assignee-info">
                    <div class="assignee-avatar">{{ assignedEmployee()!.name.charAt(0) }}</div>
                    <div>
                      <strong>{{ assignedEmployee()!.name }}</strong>
                      <small>{{ assignedEmployee()!.title || getRoleLabel(assignedEmployee()!.role) }}</small>
                    </div>
                  </div>
                }
                <select class="dga-select sm" [(ngModel)]="assigneeId" (ngModelChange)="onAssigneeChange()">
                  <option value="">بدون تعيين</option>
                  @for (e of store.employees(); track e.id) {
                    <option [value]="e.id">{{ e.name }} — {{ e.title || getRoleLabel(e.role) }}</option>
                  }
                </select>
              </div>

              <!-- Team Members (Multi-Lawyer) -->
              <div class="info-panel">
                <div class="panel-header-row">
                  <div class="panel-header-icon">
                    <i class="bi bi-people"></i>
                  </div>
                  <span class="panel-title">فريق العمل</span>
                  <a class="panel-link" (click)="showTeamPicker.set(!showTeamPicker())">{{ showTeamPicker() ? 'إغلاق' : 'تعديل' }}</a>
                </div>
                @if (teamMembers().length > 0) {
                  <div class="team-list">
                    @for (member of teamMembers(); track member.id) {
                      <div class="team-member">
                        <div class="assignee-avatar sm">{{ member.name.charAt(0) }}</div>
                        <div>
                          <strong>{{ member.name }}</strong>
                          <small>{{ member.title || getRoleLabel(member.role) }}</small>
                        </div>
                        <button class="remove-member" (click)="removeTeamMember(member.id)">✕</button>
                      </div>
                    }
                  </div>
                } @else {
                  <small class="empty-team">لم يتم تعيين فريق عمل بعد</small>
                }
                @if (showTeamPicker()) {
                  <select class="dga-select sm" (change)="addTeamMember($any($event.target).value); $any($event.target).value=''">
                    <option value="">إضافة عضو...</option>
                    @for (e of availableTeamMembers(); track e.id) {
                      <option [value]="e.id">{{ e.name }} — {{ e.title || getRoleLabel(e.role) }}</option>
                    }
                  </select>
                }
              </div>

              <!-- Communication -->
              <div class="info-panel">
                <div class="panel-header-row">
                  <div class="panel-header-icon">
                    <i class="bi bi-chat-dots"></i>
                  </div>
                  <span class="panel-title">التواصل</span>
                  <a class="panel-link">عرض التفاصيل</a>
                </div>
                <button class="comm-btn" (click)="showCommModal.set(true)">
                  <i class="bi bi-send"></i>
                  إرسال رسالة للعميل
                </button>
              </div>

              <!-- Notes / Quick Notes -->
              <div class="info-panel">
                <div class="panel-header-row">
                  <div class="panel-header-icon">
                    <i class="bi bi-journal-text"></i>
                  </div>
                  <span class="panel-title">ملاحظات سريعة</span>
                  <a class="panel-link" (click)="showNotes.set(!showNotes())">{{ showNotes() ? 'إغلاق' : 'إضافة' }}</a>
                </div>
                @if (showNotes()) {
                  <textarea class="dga-select sm notes-input" [(ngModel)]="newNote" rows="2" placeholder="اكتب ملاحظة..."></textarea>
                  <button class="comm-btn" (click)="addNote()" [disabled]="!newNote">
                    <i class="bi bi-plus-circle"></i>
                    حفظ الملاحظة
                  </button>
                }
                @if (notes().length > 0) {
                  <div class="notes-list">
                    @for (note of notes(); track $index) {
                      <div class="note-item">
                        <div class="note-dot"></div>
                        <div class="note-content">
                          <p>{{ note.text }}</p>
                          <small>{{ note.date }}</small>
                        </div>
                      </div>
                    }
                  </div>
                } @else if (!showNotes()) {
                  <small class="empty-team">لا توجد ملاحظات</small>
                }
              </div>

              <!-- Case Data -->
              <div class="info-panel">
                <div class="panel-header-row">
                  <div class="panel-header-icon">
                    <i class="bi bi-briefcase"></i>
                  </div>
                  <span class="panel-title">بيانات القضية</span>
                  <a class="panel-link">عرض التفاصيل</a>
                </div>
                <div class="info-row">
                  <span>معرّف القضية</span>
                  <div class="info-val"><i class="bi bi-folder"></i> {{ caseData()!.id }}</div>
                </div>
                <div class="info-row">
                  <span>المحكمة</span>
                  <strong>{{ courtName() }}</strong>
                </div>
                <div class="info-row">
                  <span>النشاط</span>
                  <div class="info-val">
                    <span class="status-dot" [class]="'dot-' + caseData()!.status"></span>
                    {{ categoryName() }}
                  </div>
                </div>
                <div class="info-row">
                  <span>حالة القضية</span>
                  <span class="status-tag" [class]="'tag-' + caseData()!.status">
                    {{ getStatusLabel(caseData()!.status) }}
                  </span>
                </div>
                @if (caseData()!.najizNumber) {
                  <div class="info-row">
                    <span>رقم ناجز</span>
                    <strong class="mono">{{ caseData()!.najizNumber }}</strong>
                  </div>
                }
              </div>
            </div>

            <!-- CENTER: Main Content -->
            <div class="main-content">

              <!-- Info Banner -->
              <div class="info-banner">
                <div class="banner-content">
                  <i class="bi bi-exclamation-triangle banner-icon"></i>
                  <span>يمكن تغيير حالة القضية أو إضافة ملاحظات من خلال قسم "المراجعة والقرار"</span>
                </div>
                <button class="banner-action" (click)="activeStep.set(4)">الذهاب للقرار</button>
              </div>

              <!-- Step Content -->
              @if (activeStep() === 1) {
                <!-- STEP 1: Case Data -->
                <div class="step-card">
                  <div class="step-card-header">
                    <i class="bi bi-file-earmark-text"></i>
                    <h3>البيانات الأساسية للطلب</h3>
                  </div>

                  <!-- Tabs within step -->
                  <div class="step-tabs">
                    <button [class.active]="innerTab() === 'basic'" (click)="innerTab.set('basic')">البيانات الأساسية للطلب</button>
                    <button [class.active]="innerTab() === 'financial'" (click)="innerTab.set('financial')">الحركة المالية</button>
                  </div>

                  @if (innerTab() === 'basic') {
                    <div class="data-grid">
                      <div class="data-item">
                        <label>نوع القضية</label>
                        <strong>{{ subtypeName() || '—' }}</strong>
                      </div>
                      <div class="data-item">
                        <label>معرّف القضية</label>
                        <div class="data-val-icon"><i class="bi bi-folder"></i> {{ caseData()!.id }}</div>
                      </div>
                      <div class="data-item">
                        <label>تاريخ رفع القضية</label>
                        <strong>{{ caseData()!.filingDate }}</strong>
                      </div>
                      <div class="data-item">
                        <label>المحكمة</label>
                        <strong>{{ courtName() }}</strong>
                      </div>
                      <div class="data-item">
                        <label>التصنيف</label>
                        <strong>{{ categoryName() }}</strong>
                      </div>
                      <div class="data-item">
                        <label>صفة العميل</label>
                        <strong>{{ caseData()!.partyRole === 'plaintiff' ? 'مدعي' : 'مدعى عليه' }}</strong>
                      </div>
                    </div>

                    <!-- Applicant Info -->
                    @if (client()) {
                      <div class="sub-section">
                        <div class="sub-header">
                          <i class="bi bi-person"></i>
                          <h4>بيانات مقدم الطلب</h4>
                          <a [routerLink]="['/clients', client()!.id]" class="sub-link">عرض التفاصيل مقدم الطلب</a>
                        </div>
                        <div class="data-grid">
                          <div class="data-item">
                            <label>الاسم الرباعي</label>
                            <div class="data-val-icon"><i class="bi bi-info-circle"></i> {{ client()!.name }}</div>
                          </div>
                          <div class="data-item">
                            <label>حالة الحساب</label>
                            <span class="active-badge"><span class="green-dot"></span> نشط</span>
                          </div>
                          <div class="data-item">
                            <label>نوع الحساب</label>
                            <div class="data-val-icon"><i class="bi bi-person-vcard"></i> {{ client()!.type === 'corporate' ? 'منشأة' : 'فرد' }}</div>
                          </div>
                          <div class="data-item">
                            <label>رقم الهوية</label>
                            <div class="data-val-icon"><i class="bi bi-clipboard"></i> {{ client()!.idNumber || '—' }}</div>
                          </div>
                          <div class="data-item">
                            <label>رقم الهاتف</label>
                            <div class="data-val-icon"><i class="bi bi-clipboard"></i> {{ client()!.phone || '—' }}</div>
                          </div>
                        </div>
                      </div>
                    }
                  }

                  @if (innerTab() === 'financial') {
                    <div class="fin-summary">
                      <div class="fin-card">
                        <small>الأتعاب المتفق عليها</small>
                        <strong>{{ fmtCurrency(caseData()!.agreedFee || 0) }}</strong>
                      </div>
                      <div class="fin-card success">
                        <small>المسدد</small>
                        <strong>{{ fmtCurrency(caseData()!.paidAmount || 0) }}</strong>
                      </div>
                      <div class="fin-card danger">
                        <small>المتبقي</small>
                        <strong>{{ fmtCurrency((caseData()!.agreedFee || 0) - (caseData()!.paidAmount || 0)) }}</strong>
                      </div>
                    </div>
                    <div class="progress-bar">
                      <div class="progress-fill" [style.width.%]="paymentProgress()"></div>
                    </div>
                    <div class="section-top-bar">
                      <strong>الفواتير المرتبطة</strong>
                      <button class="add-session-btn" (click)="showAddInvoice.set(true)">
                        <i class="bi bi-plus-circle"></i>
                        فاتورة جديدة
                      </button>
                    </div>
                    <div class="invoices-section">
                      @for (inv of caseInvoices(); track inv.id) {
                        <div class="inv-row">
                          <div class="inv-info">
                            <i class="bi bi-receipt"></i>
                            <div>
                              <strong>فاتورة #{{ inv.invoiceNumber }}</strong>
                              <small>تستحق في {{ inv.dueDate }}</small>
                            </div>
                          </div>
                          <div class="inv-amount">
                            <strong>{{ fmtCurrency(inv.total || 0) }}</strong>
                            <span class="inv-badge" [class]="'inv-' + inv.status">
                              {{ inv.status === 'paid' ? 'مدفوعة' : inv.status === 'overdue' ? 'متأخرة' : 'بانتظار السداد' }}
                            </span>
                          </div>
                        </div>
                      } @empty {
                        <div class="empty-section">
                          <i class="bi bi-receipt"></i>
                          <p>لا توجد فواتير مرتبطة</p>
                        </div>
                      }
                    </div>
                  }
                </div>
              }

              @if (activeStep() === 2) {
                <!-- STEP 2: Parties & Opponents -->
                <div class="step-card">
                  <div class="step-card-header">
                    <i class="bi bi-people"></i>
                    <h3>بيانات الأطراف</h3>
                  </div>

                  <div class="success-message">
                    <i class="bi bi-check-circle-fill"></i>
                    <span>تمت إضافة بيانات الأطراف</span>
                  </div>

                  <!-- Client Party -->
                  @if (client()) {
                    <div class="party-card">
                      <h4>بيانات العميل ({{ caseData()!.partyRole === 'plaintiff' ? 'مدعي' : 'مدعى عليه' }})</h4>
                      <div class="data-grid">
                        <div class="data-item">
                          <label>الاسم</label>
                          <strong>{{ client()!.name }}</strong>
                        </div>
                        <div class="data-item">
                          <label>رقم الهوية</label>
                          <strong class="mono">{{ client()!.idNumber || '—' }}</strong>
                        </div>
                        <div class="data-item">
                          <label>رقم الجوال</label>
                          <strong class="mono" dir="ltr">{{ client()!.phone }}</strong>
                        </div>
                        <div class="data-item">
                          <label>البريد الإلكتروني</label>
                          <strong>{{ client()!.email || '—' }}</strong>
                        </div>
                      </div>
                    </div>
                  }

                  <!-- Opponents -->
                  <div class="party-card opponent">
                    <h4>بيانات الخصوم</h4>
                    @if (caseData()!.opponents && caseData()!.opponents!.length > 0) {
                      @for (opp of caseData()!.opponents!; track $index) {
                        <div class="opp-row">
                          <span class="opp-dot"></span>
                          <span>{{ opp }}</span>
                        </div>
                      }
                    } @else {
                      <p class="no-data">لا يوجد خصوم مسجلين</p>
                    }
                  </div>
                </div>
              }

              @if (activeStep() === 3) {
                <!-- STEP 3: Documents & Sessions -->
                <div class="step-card">
                  <div class="step-card-header">
                    <i class="bi bi-paperclip"></i>
                    <h3>المرفقات والجلسات</h3>
                  </div>

                  <div class="step-tabs">
                    <button [class.active]="docTab() === 'docs'" (click)="docTab.set('docs')">المستندات</button>
                    <button [class.active]="docTab() === 'sessions'" (click)="docTab.set('sessions')">الجلسات</button>
                  </div>

                  @if (docTab() === 'docs') {
                    <button class="add-session-btn" (click)="showAddDoc.set(true)">
                      <i class="bi bi-upload"></i>
                      إضافة مستند
                    </button>
                    @if (caseDocuments().length > 0) {
                      <div class="docs-list">
                        @for (doc of caseDocuments(); track doc.id) {
                          <div class="doc-row">
                            <i class="bi bi-file-earmark doc-icon" [class]="'doc-' + doc.type"></i>
                            <div class="doc-info">
                              <strong>{{ doc.title }}</strong>
                              <small>{{ doc.type.toUpperCase() }} · {{ doc.fileSize }} · {{ doc.createdAt | date:'shortDate':'':'ar' }}</small>
                            </div>
                          </div>
                        }
                      </div>
                    } @else {
                      <div class="empty-section">
                        <i class="bi bi-folder2-open"></i>
                        <p>لا توجد مستندات مرتبطة بالقضية</p>
                      </div>
                    }
                  }

                  @if (docTab() === 'sessions') {
                    <button class="add-session-btn" (click)="showAddSession.set(true)">
                      <i class="bi bi-plus-circle"></i>
                      إضافة جلسة
                    </button>
                    <div class="timeline">
                      @for (event of timelineEvents(); track event.id) {
                        <div class="tl-item">
                          <div class="tl-dot" [style.background]="event.dotColor"></div>
                          <div class="tl-content">
                            <div class="tl-row">
                              <strong>{{ event.title }}</strong>
                              <span class="tl-badge" [style.background]="event.statusBg" [style.color]="event.statusColor">{{ event.statusLabel }}</span>
                            </div>
                            <small>{{ event.date | date:'EEEE، d MMMM yyyy':'':'ar' }}</small>
                            @if (event.notes) { <p class="tl-notes">{{ event.notes }}</p> }
                            @if (event.courtBranch) { <span class="tl-location"><i class="bi bi-geo-alt"></i> {{ event.courtBranch }}</span> }
                          </div>
                        </div>
                      }
                      <!-- Case creation event -->
                      <div class="tl-item">
                        <div class="tl-dot" style="background: var(--tmk-primary, #1B8354);"></div>
                        <div class="tl-content">
                          <strong>تسجيل القضية</strong>
                          <small>{{ caseData()!.filingDate }}</small>
                          <p class="tl-notes">تم فتح ملف القضية وبدء الإجراءات</p>
                        </div>
                      </div>
                    </div>
                  }
                </div>
              }

              @if (activeStep() === 4) {
                <!-- STEP 4: Review & Decision -->
                <div class="step-card">
                  <div class="step-card-header decision-header">
                    <i class="bi bi-flag"></i>
                    <h3>القرار النهائي</h3>
                    @if (decision) {
                      <span class="decision-tag" [class]="'dec-' + decision">
                        <span class="dec-dot"></span>
                        {{ getDecisionLabel(decision) }}
                      </span>
                    }
                  </div>

                  <div class="decision-options">
                    <label class="decision-opt" [class.selected]="decision === 'approve'" (click)="decision = 'approve'">
                      <input type="radio" name="decision" value="approve" [(ngModel)]="decision" hidden>
                      <i class="bi bi-check-circle"></i>
                      <span>إعتماد وإغلاق</span>
                    </label>
                    <label class="decision-opt" [class.selected]="decision === 'return'" (click)="decision = 'return'">
                      <input type="radio" name="decision" value="return" [(ngModel)]="decision" hidden>
                      <i class="bi bi-arrow-return-left"></i>
                      <span>إرجاع للمتابعة</span>
                    </label>
                    <label class="decision-opt" [class.selected]="decision === 'reject'" (click)="decision = 'reject'">
                      <input type="radio" name="decision" value="reject" [(ngModel)]="decision" hidden>
                      <i class="bi bi-x-circle"></i>
                      <span>رفض وإغلاق</span>
                    </label>
                  </div>

                  @if (decision) {
                    <div class="decision-message" [class]="'dm-' + decision">
                      <i class="bi bi-check-circle-fill"></i>
                      <span>{{ getDecisionMessage(decision) }}</span>
                    </div>
                  }

                  <!-- Review Tabs -->
                  <div class="step-tabs">
                    <button [class.active]="reviewTab() === 'basic'" (click)="reviewTab.set('basic')">البيانات الأساسية للطلب</button>
                    <button [class.active]="reviewTab() === 'parties'" (click)="reviewTab.set('parties')">بيانات الأطراف</button>
                    <button [class.active]="reviewTab() === 'attachments'" (click)="reviewTab.set('attachments')">المرفقات</button>
                  </div>

                  @if (reviewTab() === 'basic') {
                    <div class="data-grid">
                      <div class="data-item">
                        <label>نوع القضية</label>
                        <strong>{{ subtypeName() || '—' }}</strong>
                      </div>
                      <div class="data-item">
                        <label>معرّف القضية</label>
                        <strong>{{ caseData()!.id }}</strong>
                      </div>
                      <div class="data-item">
                        <label>تاريخ رفع القضية</label>
                        <strong>{{ caseData()!.filingDate }}</strong>
                      </div>
                      <div class="data-item">
                        <label>المحكمة</label>
                        <strong>{{ courtName() }}</strong>
                      </div>
                    </div>
                    <a class="back-step-link" (click)="activeStep.set(1)">
                      <i class="bi bi-chevron-left"></i>
                      الرجوع إلى خطوة بيانات الأساسية للطلب
                    </a>
                  }

                  @if (reviewTab() === 'parties') {
                    @if (client()) {
                      <div class="data-grid">
                        <div class="data-item"><label>اسم العميل</label><strong>{{ client()!.name }}</strong></div>
                        <div class="data-item"><label>رقم الهوية</label><strong class="mono">{{ client()!.idNumber || '—' }}</strong></div>
                        <div class="data-item"><label>الصفة</label><strong>{{ caseData()!.partyRole === 'plaintiff' ? 'مدعي' : 'مدعى عليه' }}</strong></div>
                      </div>
                    }
                  }

                  @if (reviewTab() === 'attachments') {
                    @if (caseDocuments().length > 0) {
                      @for (doc of caseDocuments(); track doc.id) {
                        <div class="doc-row">
                          <i class="bi bi-file-earmark"></i>
                          <div class="doc-info">
                            <strong>{{ doc.title }}</strong>
                            <small>{{ doc.type.toUpperCase() }} · {{ doc.fileSize }}</small>
                          </div>
                        </div>
                      }
                    } @else {
                      <div class="empty-section">
                        <i class="bi bi-folder2-open"></i>
                        <p>لا توجد مرفقات</p>
                      </div>
                    }
                  }
                </div>
              }

              @if (activeStep() === 5) {
                <!-- STEP 5: AI Engine -->
                <div class="step-card">
                  <div class="step-card-header">
                    <i class="bi bi-cpu"></i>
                    <h3>التحليل الذكي</h3>
                  </div>

                  <div class="ai-step-layout">
                    <div class="ai-step-main">
                      <!-- Action Panel -->
                      <ai-action-panel
                        [caseId]="caseData()!.id"
                        [courtType]="caseData()!.courtType"
                        [documents]="caseDocuments()"
                        (analysisComplete)="onAnalysisComplete($event)">
                      </ai-action-panel>

                      <!-- Results Display -->
                      @if (currentAIResult()) {
                        <div style="margin-top: 1.25rem;">
                          <ai-findings-display
                            [result]="currentAIResult()!"
                            [actionId]="lastActionId()"
                            (applyCounterLanguage)="onApplyCounter($event)"
                            (reviewAction)="onReviewAction($event)">
                          </ai-findings-display>
                        </div>
                      }
                    </div>

                    <div class="ai-step-sidebar">
                      <!-- Usage Widget -->
                      <ai-usage-widget></ai-usage-widget>

                      <!-- Analysis History -->
                      <div style="margin-top: 1rem;">
                        <ai-analysis-history
                          [selectedId]="selectedAnalysisId()"
                          (viewAnalysis)="onViewAnalysis($event)">
                        </ai-analysis-history>
                      </div>
                    </div>
                  </div>
                </div>
              }

              <!-- Bottom Navigation -->
              <div class="bottom-nav">
                @if (activeStep() > 1) {
                  <button class="nav-btn prev" (click)="prevStep()">
                    السابق
                    <i class="bi bi-arrow-right"></i>
                  </button>
                } @else {
                  <div></div>
                }
                @if (activeStep() < 5) {
                  <button class="nav-btn next" (click)="nextStep()">
                    التالي ({{ stepLabels[activeStep()] }})
                    <i class="bi bi-arrow-left"></i>
                  </button>
                } @else if (activeStep() === 4 && decision) {
                  <button class="nav-btn submit" (click)="submitDecision()">
                    <i class="bi bi-check-lg"></i>
                    تأكيد القرار
                  </button>
                }
              </div>
            </div>

            <!-- STEPPER SIDEBAR (renders RIGHT in RTL via CSS order) -->
            <div class="stepper-sidebar">
              @for (s of stepConfig; track s.id) {
                <div class="step-item" [class.completed]="activeStep() > s.id" [class.active]="activeStep() === s.id" (click)="activeStep.set(s.id)">
                  <div class="step-indicator">
                    <div class="step-circle" [class.completed]="activeStep() > s.id" [class.active]="activeStep() === s.id">
                      @if (activeStep() > s.id) {
                        <i class="bi bi-check-lg"></i>
                      } @else {
                        {{ s.id }}
                      }
                    </div>
                    @if (!$last) {
                      <div class="step-line" [class.completed]="activeStep() > s.id"></div>
                    }
                  </div>
                  <span class="step-label">{{ s.title }}</span>
                </div>
              }
            </div>

          </div>

          <!-- ═══ ADD SESSION DIALOG ═══ -->
          @if (showAddSession()) {
            <div class="tmk-overlay" (click)="showAddSession.set(false)">
              <div class="tmk-modal" (click)="$event.stopPropagation()">
                <div class="modal-header">
                  <h3>إضافة جلسة — {{ caseData()!.title }}</h3>
                  <button class="modal-close" (click)="showAddSession.set(false)"><i class="bi bi-x-lg"></i></button>
                </div>
                <div class="modal-body">
                  <div class="form-row">
                    <div class="form-group"><label>نوع الجلسة</label>
                      <select [(ngModel)]="sesForm.type" class="dga-select">
                        <option value="first_hearing">جلسة أولى</option><option value="hearing">مرافعة</option>
                        <option value="pleading">ترافع</option><option value="judgment">حكم</option><option value="appeal">استئناف</option>
                      </select>
                    </div>
                    <div class="form-group"><label>العنوان</label><input [(ngModel)]="sesForm.title" class="dga-input" placeholder="عنوان الجلسة"></div>
                  </div>
                  <div class="form-row">
                    <div class="form-group"><label>التاريخ <span class="req">*</span></label><input type="date" [(ngModel)]="sesForm.date" class="dga-input"></div>
                    <div class="form-group"><label>الوقت</label><input type="time" [(ngModel)]="sesForm.time" class="dga-input" dir="ltr"></div>
                  </div>
                  <div class="form-row">
                    <div class="form-group"><label>فرع المحكمة</label><input [(ngModel)]="sesForm.courtBranch" class="dga-input"></div>
                    <div class="form-group"><label>قاعة المحكمة</label><input [(ngModel)]="sesForm.courtRoom" class="dga-input"></div>
                  </div>
                  <div class="form-group"><label>ملاحظات</label><textarea [(ngModel)]="sesForm.notes" class="dga-textarea" rows="2"></textarea></div>
                </div>
                <div class="modal-footer">
                  <button class="btn-outline" (click)="showAddSession.set(false)">إلغاء</button>
                  <button class="btn-primary" (click)="submitSession()" [disabled]="!sesForm.date">حفظ الجلسة</button>
                </div>
              </div>
            </div>
          }

          <!-- ═══ SUCCESS MODAL ═══ -->
          @if (showSuccess()) {
            <div class="tmk-overlay" (click)="showSuccess.set(false)">
              <div class="success-modal" (click)="$event.stopPropagation()">
                <div class="success-icon">
                  <i class="bi bi-check-lg"></i>
                </div>
                <h2>{{ successMessage() }}</h2>
                <p>تم تنفيذ القرار بنجاح، يمكنك الإطلاع على <a routerLink="/cases">القضايا المغلقة</a> من خلال صفحة القضايا</p>
                <a routerLink="/cases" class="btn-outline">العودة الى صفحة القضايا</a>
              </div>
            </div>
          }

          <!-- ═══ COMMUNICATION MODAL ═══ -->
          @if (showCommModal()) {
            <div class="tmk-overlay" (click)="showCommModal.set(false)">
              <div class="tmk-modal" (click)="$event.stopPropagation()">
                <div class="modal-header">
                  <h3>إرسال رسالة للعميل</h3>
                  <button class="modal-close" (click)="showCommModal.set(false)"><i class="bi bi-x-lg"></i></button>
                </div>
                <div class="modal-body">
                  <div class="form-group"><label>نوع الرسالة</label>
                    <select [(ngModel)]="commType" class="dga-select">
                      <option value="whatsapp">واتساب</option>
                      <option value="sms">رسالة نصية</option>
                      <option value="email">بريد إلكتروني</option>
                    </select>
                  </div>
                  <div class="form-group"><label>نص الرسالة</label>
                    <textarea [(ngModel)]="commMessage" class="dga-textarea" rows="4" placeholder="اكتب رسالتك هنا..."></textarea>
                  </div>
                </div>
                <div class="modal-footer">
                  <button class="btn-outline" (click)="showCommModal.set(false)">إلغاء</button>
                  <button class="btn-primary" (click)="sendComm()">
                    <i class="bi bi-send"></i>
                    إرسال
                  </button>
                </div>
              </div>
            </div>
          }

          <!-- ═══ ADD DOCUMENT MODAL ═══ -->
          @if (showAddDoc()) {
            <div class="tmk-overlay" (click)="showAddDoc.set(false)">
              <div class="tmk-modal" (click)="$event.stopPropagation()">
                <div class="modal-header">
                  <h3>إضافة مستند — {{ caseData()!.title }}</h3>
                  <button class="modal-close" (click)="showAddDoc.set(false)"><i class="bi bi-x-lg"></i></button>
                </div>
                <div class="modal-body">
                  <div class="form-group"><label>عنوان المستند <span class="req">*</span></label>
                    <input [(ngModel)]="docForm.title" class="dga-input" placeholder="مثال: صك الحكم، توكيل رسمي">
                  </div>
                  <div class="form-row">
                    <div class="form-group"><label>نوع الملف</label>
                      <select [(ngModel)]="docForm.type" class="dga-select">
                        <option value="pdf">PDF</option>
                        <option value="docx">Word</option>
                        <option value="image">صورة</option>
                        <option value="other">أخرى</option>
                      </select>
                    </div>
                    <div class="form-group"><label>الفئة</label>
                      <select [(ngModel)]="docForm.category" class="dga-select">
                        <option value="court">مستندات المحكمة</option>
                        <option value="contract">العقود</option>
                        <option value="evidence">الأدلة</option>
                        <option value="correspondence">المراسلات</option>
                        <option value="identity">وثائق الهوية</option>
                        <option value="other">أخرى</option>
                      </select>
                    </div>
                  </div>
                  <div class="form-group"><label>ملاحظات</label>
                    <textarea [(ngModel)]="docForm.notes" class="dga-textarea" rows="2" placeholder="ملاحظات إضافية..."></textarea>
                  </div>
                  <div class="upload-zone">
                    <i class="bi bi-cloud-upload"></i>
                    <p>اسحب الملف هنا أو اضغط للتحميل</p>
                    <small>PDF, DOCX, JPG, PNG (حتى 10 ميجابايت)</small>
                  </div>
                </div>
                <div class="modal-footer">
                  <button class="btn-outline" (click)="showAddDoc.set(false)">إلغاء</button>
                  <button class="btn-primary" (click)="submitDocument()" [disabled]="!docForm.title">حفظ المستند</button>
                </div>
              </div>
            </div>
          }

          <!-- ═══ ADD INVOICE FROM CASE MODAL ═══ -->
          @if (showAddInvoice()) {
            <div class="tmk-overlay" (click)="showAddInvoice.set(false)">
              <div class="tmk-modal" (click)="$event.stopPropagation()">
                <div class="modal-header">
                  <h3>🧾 فاتورة جديدة — {{ caseData()!.title }}</h3>
                  <button class="modal-close" (click)="showAddInvoice.set(false)"><i class="bi bi-x-lg"></i></button>
                </div>
                <div class="modal-body">
                  <div class="form-group"><label>وصف الخدمة</label>
                    <input [(ngModel)]="caseInvForm.description" class="dga-input" placeholder="أتعاب تمثيل قانوني">
                  </div>
                  <div class="form-row">
                    <div class="form-group"><label>الكمية</label><input type="number" [(ngModel)]="caseInvForm.quantity" class="dga-input" dir="ltr" min="1"></div>
                    <div class="form-group"><label>سعر الوحدة (ر.س) <span class="req">*</span></label><input type="number" [(ngModel)]="caseInvForm.unitPrice" class="dga-input" dir="ltr"></div>
                  </div>
                  <div class="form-group">
                    <label class="checkbox-label"><input type="checkbox" [(ngModel)]="caseInvForm.includeVat"> تضمين ضريبة القيمة المضافة (15%)</label>
                  </div>
                  @if (caseInvForm.unitPrice > 0) {
                    <div class="inv-preview-box">
                      <div class="ipb-row"><span>المبلغ الفرعي</span><span>{{ fmtCurrency(caseInvForm.quantity * caseInvForm.unitPrice) }}</span></div>
                      @if (caseInvForm.includeVat) {
                        <div class="ipb-row"><span>ضريبة (15%)</span><span>{{ fmtCurrency(caseInvForm.quantity * caseInvForm.unitPrice * 0.15) }}</span></div>
                      }
                      <div class="ipb-row total"><span>الإجمالي</span><strong>{{ fmtCurrency(caseInvForm.quantity * caseInvForm.unitPrice * (caseInvForm.includeVat ? 1.15 : 1)) }}</strong></div>
                    </div>
                  }
                </div>
                <div class="modal-footer">
                  <button class="btn-outline" (click)="showAddInvoice.set(false)">إلغاء</button>
                  <button class="btn-primary" (click)="submitCaseInvoice()" [disabled]="!caseInvForm.unitPrice">إصدار الفاتورة</button>
                </div>
              </div>
            </div>
          }

        }
      </div>
    </app-dashboard-layout>
  `,
  styles: [`
    .dga-detail { max-width: 1400px; margin: 0 auto; }

    .not-found { text-align: center; padding: 4rem; }
    .not-found i { font-size: 3rem; display: block; margin-bottom: 1rem; color: #f59e0b; }
    .not-found h2 { font-size: 1.5rem; margin: 0 0 0.5rem; }
    .not-found p { color: var(--text-secondary, #6b7280); margin-bottom: 1.5rem; }

    /* ── Breadcrumb ── */
    .dga-breadcrumb { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; color: var(--text-secondary, #6b7280); margin-bottom: 0.5rem; }
    .dga-breadcrumb a { color: var(--text-secondary, #6b7280); text-decoration: none; cursor: pointer; }
    .dga-breadcrumb a:hover { text-decoration: underline; }
    .dga-breadcrumb .sep { opacity: 0.5; }

    .page-title-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
    .page-title-row h1 { font-size: 1.5rem; font-weight: 800; margin: 0; }
    .exit-btn { padding: 0.5rem 1rem; border: 1px solid rgba(239,68,68,0.2); border-radius: 8px; background: rgba(239,68,68,0.05); color: #ef4444; font-family: inherit; font-size: 0.85rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 0.4rem; text-decoration: none; }
    .exit-btn:hover { background: rgba(239,68,68,0.1); }

    /* ── 3-Column Layout ── */
    .detail-layout { display: grid; grid-template-columns: 180px 1fr 260px; gap: 1.25rem; }
    .info-sidebar { order: 3; }
    .main-content { order: 2; }
    .stepper-sidebar { order: 1; }
    @media (max-width: 1100px) { .detail-layout { grid-template-columns: 1fr; } .stepper-sidebar { order: -1; display: flex; gap: 0; flex-wrap: wrap; } .step-item { flex-direction: row; } .step-line { display: none; } .info-sidebar { order: 3; } .main-content { order: 2; } }

    /* ── Left Info Sidebar ── */
    .info-sidebar { display: flex; flex-direction: column; gap: 1rem; }

    .info-panel { background: var(--card-bg, #fff); border-radius: 12px; border: 1px solid rgba(0,0,0,0.08); padding: 1.25rem; }
    .info-panel > .panel-icon { text-align: center; margin-bottom: 0.5rem; }
    .info-panel > .panel-icon i { font-size: 1.5rem; color: var(--text-secondary, #6b7280); }
    .info-panel > h4 { text-align: center; font-size: 0.95rem; margin: 0; }

    .panel-header-row { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; padding-bottom: 0.75rem; border-bottom: 1px solid rgba(0,0,0,0.06); }
    .panel-header-icon { width: 1.75rem; height: 1.75rem; display: flex; align-items: center; justify-content: center; }
    .panel-header-icon i { font-size: 1rem; color: var(--tmk-primary, #1B8354); }
    .panel-title { font-weight: 700; font-size: 0.9rem; flex: 1; }
    .panel-link { font-size: 0.8rem; color: var(--tmk-primary, #1B8354); cursor: pointer; text-decoration: none; }
    .panel-link:hover { text-decoration: underline; }

    .workflow-badge { padding: 0.5rem 0.75rem; border-radius: 6px; font-size: 0.8rem; font-weight: 600; text-align: center; }
    .wf-active { background: rgba(27,131,84,0.1); color: var(--tmk-primary, #1B8354); }
    .wf-pending { background: rgba(245,158,11,0.1); color: #d97706; }
    .wf-closed { background: rgba(107,114,128,0.1); color: #6b7280; }
    .wf-appealed { background: rgba(59,130,246,0.1); color: #2563eb; }

    .workflow-detail { margin-top: 0.75rem; }
    .wf-item { display: flex; align-items: center; gap: 0.5rem; padding: 0.4rem 0; font-size: 0.8rem; }
    .text-success { color: var(--tmk-primary, #1B8354); }
    .text-primary { color: #3b82f6; }

    .team-list { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 0.5rem; }
    .team-member { display: flex; align-items: center; gap: 0.5rem; padding: 0.4rem; background: rgba(0,0,0,0.02); border-radius: 6px; }
    .team-member strong { font-size: 0.8rem; display: block; }
    .team-member small { font-size: 0.7rem; color: var(--text-secondary); }
    .remove-member { margin-right: auto; background: none; border: none; cursor: pointer; color: #ef4444; font-size: 0.75rem; padding: 0.15rem 0.25rem; }
    .assignee-avatar.sm { width: 1.5rem; height: 1.5rem; font-size: 0.55rem; }
    .empty-team { display: block; text-align: center; color: var(--text-secondary); padding: 0.5rem 0; font-size: 0.8rem; }
    .assignee-info { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem; }
    .assignee-avatar { width: 2.5rem; height: 2.5rem; border-radius: 50%; background: linear-gradient(135deg, var(--tmk-primary, #1B8354), #3b82f6); color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; }
    .assignee-info strong { display: block; font-size: 0.85rem; }
    .assignee-info small { display: block; font-size: 0.75rem; color: var(--text-secondary, #6b7280); }

    .dga-select.sm { font-size: 0.8rem; padding: 0.45rem 0.6rem; }

    .comm-btn { width: 100%; padding: 0.65rem; border: 1px solid rgba(0,0,0,0.1); border-radius: 8px; background: var(--card-bg, #fff); font-family: inherit; font-size: 0.8rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.4rem; color: var(--text-primary); }
    .comm-btn:hover { background: rgba(0,0,0,0.03); }
    .comm-btn i { color: var(--tmk-primary, #1B8354); }

    .info-row { display: flex; justify-content: space-between; align-items: center; padding: 0.45rem 0; border-bottom: 1px solid rgba(0,0,0,0.04); font-size: 0.8rem; }
    .info-row:last-child { border-bottom: none; }
    .info-row span { color: var(--text-secondary, #6b7280); }
    .info-val { display: flex; align-items: center; gap: 0.3rem; font-weight: 600; font-size: 0.8rem; }
    .info-val i { font-size: 0.75rem; color: var(--text-secondary, #6b7280); }

    .status-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; margin-left: 0.3rem; }
    .dot-active { background: var(--tmk-primary, #1B8354); }
    .dot-pending { background: #f59e0b; }
    .dot-closed { background: #6b7280; }
    .dot-appealed { background: #3b82f6; }

    .status-tag { padding: 0.15rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600; }
    .tag-active { background: rgba(27,131,84,0.1); color: var(--tmk-primary, #1B8354); }
    .tag-pending { background: rgba(245,158,11,0.1); color: #d97706; }
    .tag-closed { background: rgba(107,114,128,0.1); color: #6b7280; }
    .tag-appealed { background: rgba(59,130,246,0.1); color: #2563eb; }
    .mono { font-family: monospace; }

    /* ── Right Stepper Sidebar ── */
    .stepper-sidebar { display: flex; flex-direction: column; gap: 0; }

    .step-item { display: flex; gap: 0.75rem; cursor: pointer; align-items: flex-start; }
    .step-indicator { display: flex; flex-direction: column; align-items: center; }
    .step-circle { width: 2.25rem; height: 2.25rem; border-radius: 50%; border: 2px solid #d1d5db; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.85rem; color: #9ca3af; background: var(--card-bg, #fff); transition: all 0.2s; flex-shrink: 0; }
    .step-circle.active { border-color: #e67e22; background: #e67e22; color: white; }
    .step-circle.completed { border-color: var(--tmk-primary, #1B8354); background: var(--tmk-primary, #1B8354); color: white; }
    .step-line { width: 2px; height: 2.5rem; background: #e5e7eb; margin: 0.25rem 0; }
    .step-line.completed { background: var(--tmk-primary, #1B8354); }
    .step-label { font-size: 0.85rem; color: var(--text-secondary, #6b7280); padding-top: 0.4rem; line-height: 1.4; }
    .step-item.active .step-label { color: var(--text-primary); font-weight: 600; }

    /* ── Main Content ── */
    .main-content { display: flex; flex-direction: column; gap: 1rem; min-width: 0; }

    .info-banner { background: var(--card-bg, #fff); border-radius: 12px; border: 1px solid rgba(245,158,11,0.2); padding: 1rem 1.25rem; display: flex; justify-content: space-between; align-items: center; gap: 1rem; }
    .banner-content { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; }
    .banner-icon { color: #f59e0b; font-size: 1.25rem; }
    .banner-action { padding: 0.4rem 0.85rem; border: 1px solid rgba(0,0,0,0.1); border-radius: 6px; background: var(--card-bg, #fff); font-family: inherit; font-size: 0.8rem; cursor: pointer; white-space: nowrap; }

    .step-card { background: var(--card-bg, #fff); border-radius: 12px; border: 1px solid rgba(0,0,0,0.08); padding: 1.5rem; }
    .step-card-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1.25rem; padding-bottom: 1rem; border-bottom: 1px solid rgba(0,0,0,0.06); }
    .step-card-header i { color: var(--tmk-primary, #1B8354); font-size: 1.1rem; }
    .step-card-header h3 { font-size: 1.1rem; font-weight: 700; margin: 0; flex: 1; }

    /* ── Step Tabs ── */
    .step-tabs { display: flex; border-bottom: 2px solid rgba(0,0,0,0.06); margin-bottom: 1.25rem; }
    .step-tabs button { padding: 0.75rem 1.25rem; border: none; border-bottom: 2px solid transparent; margin-bottom: -2px; background: transparent; font-family: inherit; font-size: 0.85rem; cursor: pointer; color: var(--text-secondary, #6b7280); transition: all 0.2s; }
    .step-tabs button.active { color: var(--tmk-primary, #1B8354); border-bottom-color: var(--tmk-primary, #1B8354); font-weight: 600; }

    /* ── Data Grid ── */
    .data-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.25rem; margin-bottom: 1rem; }
    @media (max-width: 900px) { .data-grid { grid-template-columns: repeat(2, 1fr); } }
    .data-item { }
    .data-item label { display: block; font-size: 0.8rem; color: var(--text-secondary, #6b7280); margin-bottom: 0.3rem; }
    .data-item strong { font-size: 0.9rem; }
    .data-val-icon { display: flex; align-items: center; gap: 0.3rem; font-weight: 600; font-size: 0.9rem; }
    .data-val-icon i { color: var(--text-secondary, #6b7280); font-size: 0.8rem; }
    .active-badge { display: inline-flex; align-items: center; gap: 0.35rem; font-weight: 600; font-size: 0.85rem; color: var(--tmk-primary, #1B8354); }
    .green-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--tmk-primary, #1B8354); }

    /* ── Sub Section ── */
    .sub-section { border-top: 1px solid rgba(0,0,0,0.06); padding-top: 1.25rem; }
    .sub-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; }
    .sub-header i { color: var(--tmk-primary, #1B8354); }
    .sub-header h4 { font-size: 1rem; font-weight: 700; margin: 0; flex: 1; }
    .sub-link { font-size: 0.8rem; color: var(--tmk-primary, #1B8354); text-decoration: none; }

    /* ── Financial ── */
    .fin-summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 1rem; }
    .fin-card { padding: 1rem; border-radius: 10px; background: rgba(0,0,0,0.02); border: 1px solid rgba(0,0,0,0.05); }
    .fin-card small { display: block; font-size: 0.8rem; color: var(--text-secondary, #6b7280); margin-bottom: 0.25rem; }
    .fin-card strong { font-size: 1.1rem; }
    .fin-card.success strong { color: var(--tmk-primary, #1B8354); }
    .fin-card.danger strong { color: #ef4444; }
    .progress-bar { height: 6px; background: rgba(0,0,0,0.06); border-radius: 3px; overflow: hidden; margin-bottom: 1.5rem; }
    .progress-fill { height: 100%; background: linear-gradient(90deg, var(--tmk-primary, #1B8354), #3b82f6); border-radius: 3px; transition: width 0.5s; }

    .invoices-section { display: flex; flex-direction: column; gap: 0.5rem; }
    .inv-row { display: flex; align-items: center; justify-content: space-between; padding: 0.85rem; border: 1px solid rgba(0,0,0,0.06); border-radius: 8px; }
    .inv-info { display: flex; align-items: center; gap: 0.75rem; }
    .inv-info i { font-size: 1.1rem; color: var(--tmk-primary, #1B8354); }
    .inv-info strong { display: block; font-size: 0.9rem; }
    .inv-info small { display: block; font-size: 0.8rem; color: var(--text-secondary, #6b7280); }
    .inv-amount { text-align: left; }
    .inv-amount strong { display: block; font-size: 0.9rem; }
    .inv-badge { font-size: 0.75rem; font-weight: 600; }
    .inv-paid { color: var(--tmk-primary, #1B8354); }
    .inv-overdue { color: #ef4444; }
    .inv-issued { color: #f59e0b; }

    /* ── Parties ── */
    .success-message { display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1rem; background: rgba(27,131,84,0.06); border-radius: 8px; border: 1px solid rgba(27,131,84,0.15); font-size: 0.85rem; color: var(--tmk-primary, #1B8354); font-weight: 600; margin-bottom: 1.25rem; }
    .success-message i { font-size: 1rem; }

    .party-card { padding: 1.25rem; border: 1px solid rgba(0,0,0,0.06); border-radius: 10px; margin-bottom: 1rem; }
    .party-card h4 { font-size: 0.95rem; margin: 0 0 1rem; }
    .party-card.opponent h4 { color: #ef4444; }
    .opp-row { display: flex; align-items: center; gap: 0.5rem; padding: 0.4rem 0; font-size: 0.9rem; }
    .opp-dot { width: 8px; height: 8px; border-radius: 50%; background: #ef4444; }
    .no-data { color: var(--text-secondary, #6b7280); font-size: 0.85rem; }

    /* ── Documents & Sessions ── */
    .docs-list { display: flex; flex-direction: column; gap: 0.5rem; }
    .doc-row { display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; border-radius: 8px; background: rgba(0,0,0,0.02); }
    .doc-icon { font-size: 1.25rem; color: var(--tmk-primary, #1B8354); }
    .doc-info strong { display: block; font-size: 0.9rem; }
    .doc-info small { display: block; font-size: 0.8rem; color: var(--text-secondary, #6b7280); }

    .add-session-btn { margin-bottom: 1rem; padding: 0.6rem 1rem; border: 1px dashed rgba(27,131,84,0.3); border-radius: 8px; background: rgba(27,131,84,0.03); color: var(--tmk-primary, #1B8354); font-family: inherit; font-size: 0.85rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 0.4rem; }

    .timeline { position: relative; padding-right: 1.25rem; border-right: 2px solid rgba(0,0,0,0.08); margin-right: 0.5rem; }
    .tl-item { position: relative; padding-bottom: 1.25rem; padding-right: 1.25rem; }
    .tl-dot { position: absolute; right: -1.75rem; top: 0.25rem; width: 12px; height: 12px; border-radius: 50%; border: 2px solid var(--card-bg, #fff); }
    .tl-row { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.2rem; }
    .tl-row strong { font-size: 0.9rem; }
    .tl-badge { font-size: 0.7rem; padding: 0.1rem 0.4rem; border-radius: 8px; font-weight: 600; }
    .tl-item small { font-size: 0.8rem; color: var(--text-secondary, #6b7280); }
    .tl-notes { font-size: 0.8rem; color: var(--text-secondary, #6b7280); margin: 0.2rem 0 0; }
    .tl-location { font-size: 0.8rem; color: var(--text-secondary, #6b7280); display: flex; align-items: center; gap: 0.2rem; }

    .empty-section { text-align: center; padding: 2rem; }
    .empty-section i { font-size: 2rem; display: block; margin-bottom: 0.5rem; opacity: 0.3; }
    .empty-section p { color: var(--text-secondary, #6b7280); }

    /* ── Decision ── */
    .decision-header { flex-wrap: wrap; }
    .decision-tag { padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.8rem; font-weight: 600; display: flex; align-items: center; gap: 0.35rem; }
    .dec-dot { width: 8px; height: 8px; border-radius: 50%; }
    .dec-approve { background: rgba(27,131,84,0.1); color: var(--tmk-primary, #1B8354); }
    .dec-approve .dec-dot { background: var(--tmk-primary, #1B8354); }
    .dec-return { background: rgba(245,158,11,0.1); color: #d97706; }
    .dec-return .dec-dot { background: #d97706; }
    .dec-reject { background: rgba(239,68,68,0.1); color: #ef4444; }
    .dec-reject .dec-dot { background: #ef4444; }

    .decision-options { display: flex; gap: 0.75rem; margin-bottom: 1.25rem; flex-wrap: wrap; }
    .decision-opt { display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1.25rem; border: 2px solid rgba(0,0,0,0.08); border-radius: 10px; cursor: pointer; font-size: 0.85rem; font-weight: 600; transition: all 0.2s; flex: 1; justify-content: center; }
    .decision-opt:hover { background: rgba(0,0,0,0.02); }
    .decision-opt.selected { border-color: var(--tmk-primary, #1B8354); background: rgba(27,131,84,0.05); }
    .decision-opt i { font-size: 1rem; }

    .decision-message { display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1rem; border-radius: 8px; font-size: 0.85rem; font-weight: 600; margin-bottom: 1.25rem; }
    .dm-approve { background: rgba(27,131,84,0.06); color: var(--tmk-primary, #1B8354); border: 1px solid rgba(27,131,84,0.15); }
    .dm-return { background: rgba(245,158,11,0.06); color: #92400e; border: 1px solid rgba(245,158,11,0.15); }
    .dm-reject { background: rgba(239,68,68,0.06); color: #ef4444; border: 1px solid rgba(239,68,68,0.15); }

    .back-step-link { display: flex; align-items: center; gap: 0.3rem; color: var(--text-secondary, #6b7280); font-size: 0.85rem; cursor: pointer; margin-top: 0.5rem; text-decoration: none; }
    .back-step-link:hover { color: var(--tmk-primary, #1B8354); }

    /* ── Bottom Nav ── */
    .bottom-nav { display: flex; justify-content: space-between; align-items: center; padding: 1rem 0; }
    .nav-btn { padding: 0.65rem 1.5rem; border-radius: 8px; font-family: inherit; font-size: 0.85rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 0.4rem; transition: all 0.2s; }
    .nav-btn.prev { background: transparent; border: 1px solid rgba(0,0,0,0.12); color: var(--text-primary); }
    .nav-btn.next { background: var(--tmk-primary, #1B8354); border: none; color: white; }
    .nav-btn.next:hover { background: var(--tmk-primary-dark, #166A45); }
    .nav-btn.submit { background: var(--tmk-primary, #1B8354); border: none; color: white; }
    .nav-btn.submit:hover { background: var(--tmk-primary-dark, #166A45); }

    /* ── Shared Modal ── */
    .tmk-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); z-index: 2000; display: flex; align-items: center; justify-content: center; }
    .tmk-modal { background: var(--card-bg, #fff); border-radius: 16px; width: 90%; max-width: 600px; max-height: 90vh; overflow-y: auto; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 1.5rem; border-bottom: 1px solid rgba(0,0,0,0.08); }
    .modal-header h3 { font-size: 1.1rem; font-weight: 700; margin: 0; }
    .modal-close { background: none; border: none; cursor: pointer; color: var(--text-secondary, #6b7280); font-size: 1rem; }
    .modal-body { padding: 1.5rem; }
    .modal-footer { display: flex; justify-content: flex-end; gap: 0.75rem; padding: 1rem 1.5rem; border-top: 1px solid rgba(0,0,0,0.08); }

    .form-group { margin-bottom: 1rem; }
    .form-group label { display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.35rem; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .req { color: #ef4444; }
    .dga-input, .dga-select, .dga-textarea { width: 100%; padding: 0.6rem 0.8rem; border: 1px solid rgba(0,0,0,0.15); border-radius: 8px; font-family: inherit; font-size: 0.9rem; background: var(--card-bg, #fff); box-sizing: border-box; }
    .dga-input:focus, .dga-select:focus, .dga-textarea:focus { outline: none; border-color: var(--tmk-primary, #1B8354); box-shadow: 0 0 0 3px rgba(27,131,84,0.1); }

    .btn-outline { padding: 0.55rem 1.25rem; border: 1px solid rgba(0,0,0,0.12); border-radius: 8px; background: transparent; font-family: inherit; font-size: 0.85rem; font-weight: 600; cursor: pointer; text-decoration: none; display: inline-flex; align-items: center; gap: 0.3rem; }
    .btn-primary { padding: 0.55rem 1.25rem; border: none; border-radius: 8px; background: var(--tmk-primary, #1B8354); color: white; font-family: inherit; font-size: 0.85rem; font-weight: 600; cursor: pointer; text-decoration: none; display: inline-flex; align-items: center; gap: 0.3rem; }
    .btn-primary:disabled { opacity: 0.5; }

    /* ── Success Modal ── */
    .success-modal { background: var(--card-bg, #fff); border-radius: 16px; width: 90%; max-width: 500px; padding: 3rem 2rem; text-align: center; }
    .success-icon { width: 5rem; height: 5rem; border-radius: 12px; background: var(--tmk-primary, #1B8354); color: white; display: flex; align-items: center; justify-content: center; font-size: 2.5rem; margin: 0 auto 1.5rem; }
    .success-modal h2 { font-size: 1.35rem; font-weight: 700; margin: 0 0 1rem; }
    .success-modal p { font-size: 0.9rem; color: var(--text-secondary, #6b7280); line-height: 1.7; margin: 0 0 1.5rem; }
    .success-modal a { color: var(--tmk-primary, #1B8354); text-decoration: underline; font-weight: 600; }

    /* ── Dark Mode ── */
    :host-context([data-theme="dark"]) {
      .info-panel, .step-card, .info-banner { background: var(--card-bg); border-color: var(--border-light, #384250); }
      .info-row { background: rgba(255,255,255,0.03); }
      .data-item { background: rgba(255,255,255,0.03); border-color: var(--border-light, #384250); }
      .step-tabs button { color: var(--text-secondary); }
      .step-card-header { border-color: var(--border-light, #384250); }
      .dga-input, .dga-select { background: var(--card-bg); color: var(--text-primary); border-color: var(--border-light, #384250); }
      .dga-input:focus, .dga-select:focus { border-color: #3b82f6; }
      .session-timeline-item { border-color: var(--border-light, #384250); }
      .workflow-badge { background: rgba(255,255,255,0.06); }
      .decision-option { border-color: var(--border-light, #384250); background: rgba(255,255,255,0.02); }
      .decision-option.selected { background: rgba(59,130,246,0.1); }
    }

    /* ── Upload Zone ── */
    .upload-zone { border: 2px dashed rgba(27,131,84,0.3); border-radius: 12px; padding: 2rem; text-align: center; background: rgba(27,131,84,0.02); cursor: pointer; margin-top: 0.5rem; }

    /* ── Notes ── */
    .notes-input { width: 100%; margin-bottom: 0.5rem; resize: vertical; min-height: 2.5rem; font-size: 0.85rem; padding: 0.5rem; border-radius: 6px; border: 1px solid rgba(0,0,0,0.1); font-family: inherit; box-sizing: border-box; }
    .notes-list { margin-top: 0.75rem; display: flex; flex-direction: column; gap: 0.5rem; }
    .note-item { display: flex; gap: 0.5rem; align-items: flex-start; }
    .note-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--tmk-primary, #1B8354); margin-top: 0.4rem; flex-shrink: 0; }
    .note-content p { font-size: 0.8rem; margin: 0; line-height: 1.5; }
    .note-content small { font-size: 0.7rem; color: var(--text-secondary, #6b7280); }
    .upload-zone i { font-size: 2rem; color: var(--tmk-primary, #1B8354); display: block; margin-bottom: 0.5rem; }
    .upload-zone p { margin: 0; font-size: 0.9rem; font-weight: 600; }
    .upload-zone small { color: var(--text-secondary, #6b7280); font-size: 0.8rem; }
    .upload-zone:hover { border-color: var(--tmk-primary, #1B8354); background: rgba(27,131,84,0.05); }

    /* ── Section Top Bar ── */
    .section-top-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
    .section-top-bar strong { font-size: 0.9rem; }

    /* ── Checkbox ── */
    .checkbox-label { display: flex; align-items: center; gap: 0.5rem; font-size: 0.9rem; cursor: pointer; }

    /* ── Invoice Preview Box ── */
    .inv-preview-box { background: rgba(0,0,0,0.02); border-radius: 10px; padding: 1rem; margin-top: 0.5rem; border: 1px solid rgba(0,0,0,0.06); }
    .ipb-row { display: flex; justify-content: space-between; padding: 0.35rem 0; font-size: 0.9rem; }
    .ipb-row.total { border-top: 2px solid rgba(0,0,0,0.1); padding-top: 0.5rem; margin-top: 0.25rem; color: var(--tmk-primary, #1B8354); font-size: 1.05rem; }

    /* ── AI Step Layout ── */
    .ai-step-layout { display: grid; grid-template-columns: 1fr 280px; gap: 1.25rem; }
    .ai-step-main { min-width: 0; }
    .ai-step-sidebar { display: flex; flex-direction: column; }
    @media (max-width: 900px) { .ai-step-layout { grid-template-columns: 1fr; } .ai-step-sidebar { order: -1; } }
  `]
})
export class CaseDetailComponent {
  private route = inject(ActivatedRoute);
  store = inject(StoreService);
  aiService = inject(AIEngineService);

  activeStep = signal(1);
  innerTab = signal('basic');
  docTab = signal('docs');
  reviewTab = signal('basic');
  showWorkflow = signal(false);
  showAddSession = signal(false);
  showSuccess = signal(false);
  showCommModal = signal(false);
  showAddDoc = signal(false);
  showAddInvoice = signal(false);
  showNotes = signal(false);
  successMessage = signal('');

  // AI Engine state
  currentAIResult = signal<AIAnalysisResult | null>(null);
  lastActionId = signal<any>('contract_review');
  selectedAnalysisId = signal('');

  decision = '';
  assigneeId = '';
  statusChange = '';
  commType = 'whatsapp';
  commMessage = '';
  newNote = '';
  notes = signal<{text: string; date: string}[]>([]);

  stepConfig = [
    { id: 1, title: 'بيانات الطلب' },
    { id: 2, title: 'بيانات الأطراف' },
    { id: 3, title: 'المرفقات' },
    { id: 4, title: 'للمراجعة و القرار' },
    { id: 5, title: 'التحليل الذكي' },
  ];
  stepLabels: Record<number, string> = { 1: 'بيانات الأطراف', 2: 'المرفقات', 3: 'المراجعة والقرار', 4: 'التحليل الذكي' };

  sesForm = { type: 'hearing' as string, title: '', date: '', time: '09:00', courtBranch: '', courtRoom: '', notes: '' };
  docForm = { title: '', type: 'pdf' as string, category: 'pleadings' as string, notes: '' };
  caseInvForm = { description: '', quantity: 1, unitPrice: 0, includeVat: true };

  caseData = computed(() => {
    const id = this.route.snapshot.paramMap.get('id');
    return id ? this.store.getCase(id) : undefined;
  });

  client = computed(() => {
    const c = this.caseData();
    return c ? this.store.getClient(c.clientId) : undefined;
  });

  assignedEmployee = computed(() => {
    const c = this.caseData();
    return c?.assignedTo ? this.store.getEmployee(c.assignedTo) : undefined;
  });

  showTeamPicker = signal(false);

  teamMembers = computed(() => {
    const c = this.caseData();
    if (!c?.teamMembers?.length) return [];
    return c.teamMembers.map(id => this.store.getEmployee(id)).filter(Boolean) as any[];
  });

  availableTeamMembers = computed(() => {
    const c = this.caseData();
    const existing = new Set([c?.assignedTo || '', ...(c?.teamMembers || [])]);
    return this.store.employees().filter(e => !existing.has(e.id));
  });

  sourceLead = computed(() => {
    const c = this.caseData();
    return c?.leadId ? this.store.getLead(c.leadId) : undefined;
  });

  caseSessions = computed(() => {
    const c = this.caseData();
    return c ? this.store.getCaseSessions(c.id) : [];
  });

  caseDocuments = computed(() => {
    const c = this.caseData();
    return c ? this.store.getCaseDocuments(c.id) : [];
  });

  caseInvoices = computed(() => {
    const c = this.caseData();
    return c ? this.store.getCaseInvoices(c.id) : [];
  });

  paymentProgress = computed(() => {
    const c = this.caseData();
    if (!c || !c.agreedFee) return 0;
    return Math.min(100, Math.round((c.paidAmount || 0) / c.agreedFee * 100));
  });

  courtName = computed(() => {
    const c = this.caseData();
    if (!c?.courtType) return '—';
    return SAUDI_COURTS.find(ct => ct.id === c.courtType)?.name || c.courtType;
  });

  categoryName = computed(() => {
    const c = this.caseData();
    if (!c?.courtType || !c.caseCategory) return '—';
    const court = SAUDI_COURTS.find(ct => ct.id === c.courtType);
    return court?.categories.find((cat: any) => cat.id === c.caseCategory)?.name || '—';
  });

  subtypeName = computed(() => {
    const c = this.caseData();
    if (!c?.courtType || !c.caseCategory || !c.caseSubCategory) return '—';
    const court = SAUDI_COURTS.find(ct => ct.id === c.courtType);
    const cat = court?.categories.find((cat: any) => cat.id === c.caseCategory);
    return cat?.subtypes?.find((s: any) => s.id === c.caseSubCategory)?.name || '—';
  });

  timelineEvents = computed(() => {
    return this.caseSessions().map(s => ({
      id: s.id,
      title: s.title || s.type,
      date: s.date,
      type: 'session',
      notes: s.notes,
      courtBranch: s.location,
      dotColor: s.status === 'completed' ? '#1B8354' : s.status === 'scheduled' ? '#3b82f6' : '#6b7280',
      statusLabel: s.status === 'completed' ? 'مكتملة' : s.status === 'scheduled' ? 'قادمة' : 'ملغاة',
      statusBg: s.status === 'completed' ? 'rgba(27,131,84,0.1)' : s.status === 'scheduled' ? 'rgba(59,130,246,0.1)' : 'rgba(107,114,128,0.1)',
      statusColor: s.status === 'completed' ? '#1B8354' : s.status === 'scheduled' ? '#3b82f6' : '#6b7280',
    })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  });

  constructor() {
    const c = this.caseData();
    if (c?.assignedTo) this.assigneeId = c.assignedTo;
  }

  fmtCurrency = formatCurrency;
  getStatusLabel(s: string) { return { active: 'ناجح', pending: 'معلقة', closed: 'مغلقة', won: 'محكوم لصالح', lost: 'محكوم ضد', appealed: 'مستأنفة' }[s] || s; }
  getRoleLabel(r: string) { return { admin: 'مدير', senior_lawyer: 'محامي أول', lawyer: 'محامي', paralegal: 'مساعد قانوني', secretary: 'سكرتير' }[r] || r; }

  getDecisionLabel(d: string) { return { approve: 'إعتماد وإغلاق', return: 'إرجاع للمتابعة', reject: 'رفض وإغلاق' }[d] || ''; }
  getDecisionMessage(d: string) { return { approve: 'سوف يتم إعتماد القضية و إغلاقها', return: 'سوف يتم إرجاع القضية للمتابعة', reject: 'سوف يتم رفض القضية و إغلاقها' }[d] || ''; }

  onAssigneeChange() {
    const c = this.caseData();
    if (c) {
      this.store.updateCase(c.id, { assignedTo: this.assigneeId || undefined } as any);
    }
  }

  addTeamMember(empId: string) {
    if (!empId) return;
    const c = this.caseData();
    if (!c) return;
    const members = [...(c.teamMembers || []), empId];
    this.store.updateCase(c.id, { teamMembers: members } as any);
  }

  removeTeamMember(empId: string) {
    const c = this.caseData();
    if (!c) return;
    const members = (c.teamMembers || []).filter(id => id !== empId);
    this.store.updateCase(c.id, { teamMembers: members } as any);
  }

  prevStep() { this.activeStep.update(s => s - 1); }
  nextStep() { this.activeStep.update(s => s + 1); }

  submitDecision() {
    const c = this.caseData();
    if (!c || !this.decision) return;
    if (this.decision === 'approve') {
      this.store.updateCase(c.id, { status: 'closed' } as any);
      this.successMessage.set('تم إعتماد القضية بنجاح');
    } else if (this.decision === 'reject') {
      this.store.updateCase(c.id, { status: 'closed' } as any);
      this.successMessage.set('تم رفض القضية وإغلاقها');
    } else if (this.decision === 'return') {
      this.store.updateCase(c.id, { status: 'active' } as any);
      this.successMessage.set('تم إرجاع القضية للمتابعة');
    }
    this.showSuccess.set(true);
  }

  submitSession() {
    const c = this.caseData();
    if (!c || !this.sesForm.date) return;
    this.store.addSession({
      id: this.store.generateId('SES'), caseId: c.id, clientId: c.clientId,
      type: this.sesForm.type as any, title: this.sesForm.title || 'جلسة',
      date: this.sesForm.date, time: this.sesForm.time, status: 'scheduled',
      courtBranch: this.sesForm.courtBranch, courtRoom: this.sesForm.courtRoom,
      notes: this.sesForm.notes, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    } as any);
    this.showAddSession.set(false);
    this.sesForm = { type: 'hearing', title: '', date: '', time: '09:00', courtBranch: '', courtRoom: '', notes: '' };
  }

  sendComm() {
    this.showCommModal.set(false);
    this.commMessage = '';
  }

  addNote() {
    if (!this.newNote.trim()) return;
    const now = new Date();
    const dateStr = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    this.notes.update(list => [{ text: this.newNote, date: dateStr }, ...list]);
    this.newNote = '';
    this.showNotes.set(false);
  }

  submitDocument() {
    const c = this.caseData();
    if (!c || !this.docForm.title) return;
    this.store.addDocument({
      id: this.store.generateId('DOC'), title: this.docForm.title,
      type: this.docForm.type as any, category: this.docForm.category,
      caseId: c.id, clientId: c.clientId, fileSize: '—',
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    } as any);
    this.showAddDoc.set(false);
    this.docForm = { title: '', type: 'pdf', category: 'pleadings', notes: '' };
  }

  submitCaseInvoice() {
    const c = this.caseData();
    if (!c || !this.caseInvForm.unitPrice) return;
    const sub = this.caseInvForm.quantity * this.caseInvForm.unitPrice;
    const vat = this.caseInvForm.includeVat ? sub * 0.15 : 0;
    this.store.addInvoice({
      id: this.store.generateId('INV'),
      invoiceNumber: `INV-${new Date().getFullYear()}-${String(this.store.invoices().length + 1).padStart(3, '0')}`,
      clientId: c.clientId, caseId: c.id,
      invoiceType: 'standard', subtotal: sub, vatAmount: vat, total: sub + vat,
      status: 'issued', paidAmount: 0, zatcaCompliant: true,
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      items: [{ description: this.caseInvForm.description || 'خدمات قانونية', quantity: this.caseInvForm.quantity, unitPrice: this.caseInvForm.unitPrice, amount: sub, vatRate: this.caseInvForm.includeVat ? 15 : 0, vatAmount: vat }],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    } as any);
    this.showAddInvoice.set(false);
    this.caseInvForm = { description: '', quantity: 1, unitPrice: 0, includeVat: true };
  }

  // ─── AI Engine Methods ───

  onAnalysisComplete(result: AIAnalysisResult) {
    this.currentAIResult.set(result);
    if (result.success) {
      this.selectedAnalysisId.set(result.analysis_id);
    }
  }

  onApplyCounter(finding: AIFinding) {
    if (finding.counter_language_ar) {
      navigator.clipboard?.writeText(finding.counter_language_ar);
      this.successMessage.set('تم نسخ الصياغة المقترحة');
      this.showSuccess.set(true);
      setTimeout(() => this.showSuccess.set(false), 3000);
    }
  }

  async onReviewAction(review: { status: 'reviewed' | 'rejected'; notes: string }) {
    const result = this.currentAIResult();
    if (!result) return;
    await this.aiService.reviewAnalysis(result.analysis_id, review.status, review.notes);
    this.currentAIResult.update(r => r ? { ...r, status: review.status } : null);
    this.successMessage.set(review.status === 'reviewed' ? 'تمت الموافقة على التحليل' : 'تم رفض التحليل');
    this.showSuccess.set(true);
    setTimeout(() => this.showSuccess.set(false), 3000);
  }

  onViewAnalysis(analysis: AIAnalysis) {
    this.selectedAnalysisId.set(analysis.id);
    // Load the analysis result (in production, fetch from API)
    // For now, use the last result if matching
    const last = this.currentAIResult();
    if (last?.analysis_id !== analysis.id) {
      // In production: fetch from /api/v1/ai/analysis/{id}/
      this.lastActionId.set(analysis.action_id);
    }
  }
}
