import { Component, inject, computed, signal, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DashboardLayoutComponent } from '../../layouts/dashboard/dashboard-layout.component';
import { StoreService } from '../../core/services/store.service';
import { ActivityLogService } from '../../core/services/activity-log.service';
import { FinanceEngineService } from '../../core/services/finance-engine.service';
import { formatCurrency, formatRelativeDate } from '../../core/utils/formatters';
import { SAUDI_COURTS } from '../../core/data/classifications';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DashboardLayoutComponent],
  template: `
    <app-dashboard-layout>
      <div class="tmk-home" dir="rtl">

        <!-- ═══════════════ WELCOME HEADER ═══════════════ -->
        <div class="welcome-section">
          <div class="welcome-text">
            <div class="status-dot">
              <span class="dot pulse"></span>
              <span class="status-label">متصل الآن</span>
            </div>
            <h1 class="welcome-title">
              مرحباً، <span class="gradient-text">{{ store.currentUser().name.split(' ')[0] }}</span>
            </h1>
            <p class="welcome-sub">لوحة المؤشرات والأداء — نظرة شاملة على أعمالك</p>
          </div>
          <div class="welcome-date glass-card">
            <i class="icon">📅</i>
            <div>
              <strong>{{ todayName }}</strong>
              <small>{{ todayFull }}</small>
            </div>
          </div>
        </div>

        <!-- ═══════════════ KPI STAT CARDS ═══════════════ -->
        <div class="kpi-grid">
          @for (card of kpiCards(); track card.label) {
            <a [routerLink]="card.href" class="kpi-card" [style.--accent]="card.color">
              <div class="kpi-glow" [style.background]="card.color"></div>
              <div class="kpi-body">
                <div class="kpi-info">
                  <span class="kpi-label">{{ card.label }}</span>
                  <span class="kpi-value">{{ card.value }}</span>
                  <span class="kpi-change" [class.positive]="card.changeType==='positive'" [class.negative]="card.changeType==='negative'">
                    {{ card.change }}
                  </span>
                </div>
                <div class="kpi-icon" [style.background]="card.gradient">
                  {{ card.icon }}
                </div>
              </div>
            </a>
          }
        </div>

        <!-- ═══════════════ LIVE METRICS BAR ═══════════════ -->
        <div class="live-section">
          <div class="live-header">
            <div>
              <h2>مؤشرات الأداء الفورية</h2>
              <p class="sub">تحديث تلقائي كل 3 ثوانٍ</p>
            </div>
            <span class="live-badge"><span class="dot pulse"></span> بث مباشر</span>
          </div>
          <div class="live-grid">
            @for (m of liveMetrics(); track m.label) {
              <div class="live-card">
                <span class="live-label">{{ m.label }}</span>
                <span class="live-value">{{ m.value }}</span>
                <span class="live-helper">{{ m.helper }}</span>
              </div>
            }
          </div>
        </div>

        <!-- ═══════════════ CHARTS SECTION ═══════════════ -->
        <div class="charts-grid">
          <!-- Revenue Trend Chart -->
          <div class="section-card chart-card">
            <div class="section-header compact">
              <div class="section-icon green">📈</div>
              <div>
                <h3>إيرادات الأشهر الأخيرة</h3>
                <small>المبالغ المحصلة شهرياً (ريال)</small>
              </div>
            </div>
            <div class="chart-wrap">
              <canvas #revenueChart width="600" height="250"></canvas>
            </div>
          </div>

          <!-- Case Distribution Chart -->
          <div class="section-card chart-card">
            <div class="section-header compact">
              <div class="section-icon blue">📊</div>
              <div>
                <h3>توزيع القضايا</h3>
                <small>حسب الحالة الحالية</small>
              </div>
            </div>
            <div class="chart-wrap doughnut-wrap">
              <canvas #caseChart width="250" height="250"></canvas>
              <div class="chart-legend">
                @for (item of caseDistribution(); track item.label) {
                  <div class="legend-item">
                    <span class="legend-dot" [style.background]="item.color"></span>
                    <span class="legend-label">{{ item.label }}</span>
                    <strong>{{ item.count }}</strong>
                  </div>
                }
              </div>
            </div>
          </div>

          <!-- Monthly Bar Chart -->
          <div class="section-card chart-card">
            <div class="section-header compact">
              <div class="section-icon gold">💰</div>
              <div>
                <h3>الإيرادات مقابل المصروفات</h3>
                <small>آخر 6 أشهر</small>
              </div>
            </div>
            <div class="chart-wrap">
              <canvas #barChart width="600" height="250"></canvas>
            </div>
          </div>
        </div>

        <!-- ═══════════════ MAIN CONTENT GRID ═══════════════ -->
        <div class="main-grid">

          <!-- RIGHT COLUMN (2/3) -->
          <div class="main-column">

            <!-- TASKS WITH APPROVAL WORKFLOW -->
            <div class="section-card">
              <div class="section-header">
                <div class="section-icon red">⚡</div>
                <div>
                  <h3>المهام والتكليفات</h3>
                  <small>{{ allTasks().length }} مهمة — {{ pendingApprovalTasks().length }} بانتظار الاعتماد</small>
                </div>
                <div class="task-filter-tabs">
                  <button [class.active]="taskFilter() === 'all'" (click)="taskFilter.set('all')">الكل</button>
                  <button [class.active]="taskFilter() === 'pending'" (click)="taskFilter.set('pending')">بانتظار اعتماد</button>
                  <button [class.active]="taskFilter() === 'in_progress'" (click)="taskFilter.set('in_progress')">قيد التنفيذ</button>
                  <button [class.active]="taskFilter() === 'completed'" (click)="taskFilter.set('completed')">مكتملة</button>
                </div>
              </div>
              <div class="tasks-list">
                @for (task of displayedTasks(); track task.id) {
                  <div class="task-item" [class.overdue]="isOverdue(task.dueDate ?? '')" (click)="selectTask(task)">
                    <div class="task-priority" [style.background]="getPriorityColor(task.priority)"></div>
                    <div class="task-body">
                      <div class="task-title-row">
                        <strong>{{ task.title }}</strong>
                        <span class="task-status-badge" [class]="'ts-' + task.status">{{ getTaskStatusLabel(task.status) }}</span>
                      </div>
                      <div class="task-meta">
                        @if (getTaskCase(task)) {
                          <a [routerLink]="['/cases', getTaskCase(task)!.id]" class="meta-link" (click)="$event.stopPropagation()">
                            📁 {{ getTaskCase(task)!.title }}
                          </a>
                        }
                        @if (getTaskAssignee(task)) {
                          <span class="assignee-chip">
                            <span class="assignee-avatar" [style.background]="getPriorityColor(task.priority)">{{ getTaskAssignee(task)!.name.charAt(0) }}</span>
                            {{ getTaskAssignee(task)!.name }}
                          </span>
                        }
                        @if (task.dueDate) {
                          <span class="meta-date" [class.text-red]="isOverdue(task.dueDate)">
                            📅 {{ fmtRelative(task.dueDate) }}
                          </span>
                        }
                      </div>
                    </div>
                    <div class="task-actions">
                      @if (task.status === 'pending') {
                        <button class="task-action-btn approve" (click)="approveTask(task.id); $event.stopPropagation()" title="اعتماد">✓</button>
                        <button class="task-action-btn reject" (click)="rejectTask(task.id); $event.stopPropagation()" title="رفض">✕</button>
                      }
                      @if (task.status === 'in_progress') {
                        <button class="task-action-btn complete" (click)="completeTask(task.id); $event.stopPropagation()" title="إنهاء">✓</button>
                      }
                    </div>
                  </div>
                } @empty {
                  <div class="empty-state">
                    <span class="empty-icon">🎯</span>
                    <p>لا توجد مهام في هذا القسم</p>
                  </div>
                }
              </div>
            </div>

            <!-- TASK DETAIL PANEL -->
            @if (selectedTask()) {
              <div class="section-card task-detail-card">
                <div class="section-header">
                  <div class="section-icon blue">📋</div>
                  <div>
                    <h3>{{ selectedTask()!.title }}</h3>
                    <small>{{ getTaskStatusLabel(selectedTask()!.status) }}</small>
                  </div>
                  <button class="close-detail" (click)="selectedTask.set(null)">✕</button>
                </div>
                <div class="task-detail-body">
                  <div class="task-detail-grid">
                    <div class="detail-item">
                      <label>الأولوية</label>
                      <span class="priority-badge" [style.background]="getPriorityColor(selectedTask()!.priority)">{{ getPriorityLabel(selectedTask()!.priority) }}</span>
                    </div>
                    <div class="detail-item">
                      <label>تاريخ الاستحقاق</label>
                      <strong>{{ selectedTask()!.dueDate || '—' }}</strong>
                    </div>
                    <div class="detail-item">
                      <label>الموظف المسؤول</label>
                      @if (getTaskAssignee(selectedTask()!)) {
                        <div class="assignee-detail">
                          <span class="assignee-avatar lg" [style.background]="getPriorityColor(selectedTask()!.priority)">{{ getTaskAssignee(selectedTask()!)!.name.charAt(0) }}</span>
                          <div>
                            <strong>{{ getTaskAssignee(selectedTask()!)!.name }}</strong>
                            <small>{{ getTaskAssignee(selectedTask()!)!.role }}</small>
                          </div>
                        </div>
                      } @else {
                        <span class="muted">غير مُسند</span>
                      }
                    </div>
                    @if (getTaskCase(selectedTask()!)) {
                      <div class="detail-item">
                        <label>القضية المرتبطة</label>
                        <a [routerLink]="['/cases', getTaskCase(selectedTask()!)!.id]" class="case-link">📁 {{ getTaskCase(selectedTask()!)!.title }}</a>
                      </div>
                    }
                  </div>
                  @if (selectedTask()!.description) {
                    <div class="detail-description">
                      <label>الوصف</label>
                      <p>{{ selectedTask()!.description }}</p>
                    </div>
                  }
                  <div class="task-detail-actions">
                    @if (selectedTask()!.status === 'pending') {
                      <button class="tmk-btn primary" (click)="approveTask(selectedTask()!.id)">✓ اعتماد المهمة</button>
                      <button class="tmk-btn outline" (click)="rejectTask(selectedTask()!.id)">✕ رفض</button>
                    }
                    @if (selectedTask()!.status === 'in_progress') {
                      <button class="tmk-btn primary" (click)="completeTask(selectedTask()!.id)">✓ إنهاء المهمة</button>
                    }
                  </div>
                </div>
              </div>
            }

            <!-- UPCOMING SESSIONS - linked to cases and clients -->
            <div class="section-card">
              <div class="section-header">
                <div class="section-icon blue">⚖️</div>
                <div>
                  <h3>الجلسات القادمة</h3>
                  <small>{{ upcomingSessions().length }} جلسة خلال الأسبوع</small>
                </div>
                <a routerLink="/calendar" class="link-btn">عرض الكل ←</a>
              </div>
              <div class="sessions-list">
                @for (session of upcomingSessions(); track session.id) {
                  <a [routerLink]="['/cases', session.caseId]" class="session-item">
                    <div class="session-time-box">
                      <span class="session-hour">{{ session.time.split(':')[0] || '09' }}</span>
                      <span class="session-ampm">{{ getAmPm(session.time) }}</span>
                    </div>
                    <div class="session-body">
                      <strong>{{ session.title || session.type }}</strong>
                      <div class="session-meta">
                        <span>📅 {{ fmtDate(session.date) }}</span>
                        @if (getSessionCase(session)) {
                          <span class="meta-case">📁 {{ getSessionCase(session)!.title }}</span>
                        }
                        @if (getSessionClient(session)) {
                          <span>👤 {{ getSessionClient(session)!.name }}</span>
                        }
                      </div>
                    </div>
                    <span class="session-badge">قادمة</span>
                  </a>
                } @empty {
                  <div class="empty-state">
                    <span class="empty-icon">📅</span>
                    <p>لا توجد جلسات قادمة</p>
                  </div>
                }
              </div>
            </div>

            <!-- RECENT ACTIVITY FEED - real actions from store -->
            <div class="section-card">
              <div class="section-header">
                <div class="section-icon purple">📊</div>
                <div>
                  <h3>آخر النشاطات</h3>
                  <small>ما حدث مؤخراً في المكتب</small>
                </div>
              </div>
              <div class="activity-timeline">
                @for (activity of recentActivities(); track activity.id) {
                  <div class="activity-item">
                    <div class="activity-dot" [style.background]="activity.color"></div>
                    <div class="activity-content">
                      <strong>{{ activity.title }}</strong>
                      <p>{{ activity.description }}</p>
                      <small>{{ activity.time }}</small>
                    </div>
                  </div>
                }
              </div>
            </div>
          </div>

          <!-- LEFT COLUMN - SIDEBAR (1/3) -->
          <div class="sidebar-column">

            <!-- QUICK ACTIONS - Open dialogs, not navigate! -->
            <div class="section-card">
              <div class="section-header compact">
                <span>⚡ إجراءات سريعة</span>
              </div>
              <div class="quick-actions">
                <button class="qa-btn primary" (click)="openQuickAction('case')">
                  <span>➕</span> قضية جديدة
                </button>
                <button class="qa-btn" (click)="openQuickAction('lead')">
                  <span>👤</span> فرصة جديدة
                </button>
                <button class="qa-btn" (click)="openQuickAction('session')">
                  <span>📅</span> جدولة جلسة
                </button>
                <button class="qa-btn" (click)="openQuickAction('invoice')">
                  <span>🧾</span> إصدار فاتورة
                </button>
                <button class="qa-btn whatsapp" (click)="openWhatsApp()">
                  <span>💬</span> إرسال واتساب
                </button>
              </div>
            </div>

            <!-- PERFORMANCE SUMMARY -->
            <div class="section-card">
              <div class="section-header compact">
                <span>📈 ملخص الأداء</span>
              </div>
              <div class="perf-list">
                @for (p of perfSummary(); track p.label) {
                  <div class="perf-item">
                    <span class="perf-icon" [style.color]="p.iconColor">{{ p.icon }}</span>
                    <div class="perf-info">
                      <small>{{ p.label }}</small>
                      <strong>{{ p.value }}</strong>
                    </div>
                  </div>
                }
              </div>
            </div>

            <!-- FINANCIAL SUMMARY -->
            <div class="section-card">
              <div class="section-header compact">
                <span>💰 الملخص المالي</span>
              </div>
              <div class="fin-summary">
                <div class="fin-row main">
                  <span>إجمالي الإيرادات</span>
                  <strong class="text-green">{{ fmtCurrency(finSummary().totalRevenue) }}</strong>
                </div>
                <div class="fin-row">
                  <span>فواتير معلقة</span>
                  <strong class="text-orange">{{ fmtCurrency(finSummary().pendingAmount) }}</strong>
                </div>
                <div class="fin-row">
                  <span>فواتير متأخرة</span>
                  <strong class="text-red">{{ fmtCurrency(finSummary().overdueAmount) }}</strong>
                </div>
                <div class="fin-divider"></div>
                <div class="fin-row">
                  <span>المصروفات</span>
                  <strong>{{ fmtCurrency(finSummary().totalExpenses) }}</strong>
                </div>
                <div class="fin-row main">
                  <span>صافي الدخل</span>
                  <strong [class.text-green]="finSummary().netIncome >= 0" [class.text-red]="finSummary().netIncome < 0">
                    {{ fmtCurrency(finSummary().netIncome) }}
                  </strong>
                </div>
                <a routerLink="/finance" class="fin-link">عرض التفاصيل المالية ←</a>
              </div>
            </div>

            <!-- ALERTS -->
            @if (criticalAlerts().length > 0) {
              <div class="section-card alerts-card">
                <div class="section-header compact alert-header">
                  <span>🚨 تنبيهات عاجلة ({{ criticalAlerts().length }})</span>
                </div>
                <div class="alerts-list">
                  @for (alert of criticalAlerts(); track alert.id) {
                    <div class="alert-item" [class]="'severity-' + alert.severity">
                      <span class="alert-icon">{{ alert.severity === 'critical' ? '🔴' : '🟡' }}</span>
                      <div class="alert-body">
                        <strong>{{ alert.title }}</strong>
                        <small>{{ alert.description }}</small>
                      </div>
                    </div>
                  }
                </div>
              </div>
            }

          </div>
        </div>

        <!-- ═══════════════ QUICK ACTION DIALOGS ═══════════════ -->
        @if (quickActionType()) {
          <div class="tmk-overlay" (click)="closeQuickAction()">
            <div class="tmk-modal large" (click)="$event.stopPropagation()">

              <!-- ADD CASE QUICK DIALOG -->
              @if (quickActionType() === 'case') {
                <div class="modal-header">
                  <h3>⚖️ قضية جديدة</h3>
                  <button (click)="closeQuickAction()">✕</button>
                </div>
                <div class="modal-body wizard">
                  <div class="wizard-steps">
                    @for (s of caseSteps; track s.id) {
                      <div class="wizard-step" [class.active]="caseStep() === s.id" [class.done]="caseStep() > s.id">
                        <div class="step-circle">{{ caseStep() > s.id ? '✓' : s.id }}</div>
                        <span>{{ s.title }}</span>
                      </div>
                    }
                  </div>

                  @if (caseStep() === 1) {
                    <div class="form-section animate-in">
                      <div class="form-group">
                        <label>عنوان القضية <span class="req">*</span></label>
                        <input [(ngModel)]="caseForm.title" placeholder="مثال: نزاع تجاري - عقد توريد" class="tmk-input">
                      </div>
                      <div class="form-row">
                        <div class="form-group">
                          <label>العميل الموكل <span class="req">*</span></label>
                          <select [(ngModel)]="caseForm.clientId" class="tmk-select">
                            <option value="">اختر عميلاً...</option>
                            @for (c of store.clients(); track c.id) {
                              <option [value]="c.id">{{ c.name }}</option>
                            }
                          </select>
                        </div>
                        <div class="form-group">
                          <label>الخصم <span class="req">*</span></label>
                          <input [(ngModel)]="caseForm.opponent" placeholder="اسم الخصم" class="tmk-input">
                        </div>
                      </div>
                      <div class="form-group">
                        <label>صفة العميل في الدعوى <span class="req">*</span></label>
                        <div class="role-picker">
                          <label class="role-card" [class.selected]="caseForm.partyRole === 'plaintiff'">
                            <input type="radio" [(ngModel)]="caseForm.partyRole" value="plaintiff" hidden>
                            <span class="role-icon">👤</span>
                            <strong>مدعي</strong>
                            <small>رافع الدعوى</small>
                          </label>
                          <label class="role-card" [class.selected]="caseForm.partyRole === 'defendant'">
                            <input type="radio" [(ngModel)]="caseForm.partyRole" value="defendant" hidden>
                            <span class="role-icon">🛡️</span>
                            <strong>مدعى عليه</strong>
                            <small>مقدم ضده</small>
                          </label>
                        </div>
                      </div>
                    </div>
                  }
                  @if (caseStep() === 2) {
                    <div class="form-section animate-in">
                      <div class="form-group">
                        <label>المحكمة المختصة <span class="req">*</span></label>
                        <select [(ngModel)]="caseForm.courtType" (ngModelChange)="onCourtChange()" class="tmk-select">
                          <option value="">اختر المحكمة...</option>
                          @for (court of saudiCourts; track court.id) {
                            <option [value]="court.id">{{ court.name }}</option>
                          }
                        </select>
                      </div>
                      <div class="form-group">
                        <label>التصنيف الرئيسي <span class="req">*</span></label>
                        <select [(ngModel)]="caseForm.category" (ngModelChange)="onCategoryChange()" class="tmk-select" [disabled]="!caseForm.courtType">
                          <option value="">اختر التصنيف...</option>
                          @for (cat of getCourtCategories(); track cat.id) {
                            <option [value]="cat.id">{{ cat.name }} ({{ cat.subtypes.length }})</option>
                          }
                        </select>
                      </div>
                      <div class="form-group">
                        <label>نوع الدعوى الدقيق <span class="req">*</span></label>
                        <select [(ngModel)]="caseForm.subtype" class="tmk-select highlighted" [disabled]="!caseForm.category">
                          <option value="">حدد نوع الدعوى بدقة...</option>
                          @for (sub of getCategorySubtypes(); track sub.id) {
                            <option [value]="sub.id">{{ sub.name }}</option>
                          }
                        </select>
                        <small class="form-hint">سيتم تحديد المسار الإجرائي والمواعيد النظامية بناءً على هذا الاختيار</small>
                      </div>
                    </div>
                  }
                  @if (caseStep() === 3) {
                    <div class="form-section animate-in">
                      @if (getSelectedSubtype()) {
                        <div class="smart-alert">
                          <span class="smart-icon">⚠️</span>
                          <div>
                            <strong>محرك التنبيهات الذكي</strong>
                            <p>بناءً على اختيارك (<strong>{{ getSelectedSubtype()!.name }}</strong>)، فإن مهلة الاستئناف النظامية هي <strong>{{ getSelectedSubtype()!.appealDeadline }} يوماً</strong> من تاريخ استلام الصك.</p>
                          </div>
                        </div>
                      }
                      <div class="form-row">
                        <div class="form-group">
                          <label>تاريخ بداية القضية</label>
                          <input type="date" [(ngModel)]="caseForm.filingDate" class="tmk-input">
                        </div>
                        <div class="form-group">
                          <label class="text-red">تاريخ انتهاء الوكالة <span class="req">*</span></label>
                          <input type="date" [(ngModel)]="caseForm.agencyExpiry" class="tmk-input border-red">
                        </div>
                      </div>
                      <div class="form-group">
                        <label>رقم القضية في ناجز</label>
                        <input [(ngModel)]="caseForm.najizNumber" placeholder="مثال: 44120001234" class="tmk-input mono" dir="ltr">
                      </div>
                      <div class="form-group">
                        <label>ملاحظات</label>
                        <textarea [(ngModel)]="caseForm.description" placeholder="وصف مختصر..." class="tmk-textarea" rows="3"></textarea>
                      </div>
                      <div class="ai-hint">
                        ✨ ميزة قادمة: استخراج التواريخ تلقائياً من الصكوك (Tamkeen AI)
                      </div>
                    </div>
                  }
                </div>
                <div class="modal-footer wizard-footer">
                  <button class="tmk-btn outline" (click)="prevCaseStep()" [disabled]="caseStep() === 1">
                    السابق →
                  </button>
                  @if (caseStep() < 3) {
                    <button class="tmk-btn primary" (click)="nextCaseStep()">← التالي</button>
                  } @else {
                    <button class="tmk-btn primary" (click)="submitCase()">✓ حفظ القضية</button>
                  }
                </div>
              }

              <!-- ADD LEAD QUICK DIALOG -->
              @if (quickActionType() === 'lead') {
                <div class="modal-header">
                  <h3>👤 فرصة جديدة</h3>
                  <button (click)="closeQuickAction()">✕</button>
                </div>
                <div class="modal-body">
                  <div class="form-row">
                    <div class="form-group">
                      <label>الاسم <span class="req">*</span></label>
                      <input [(ngModel)]="leadForm.name" class="tmk-input" placeholder="اسم العميل المحتمل">
                    </div>
                    <div class="form-group">
                      <label>الجوال <span class="req">*</span></label>
                      <input [(ngModel)]="leadForm.phone" class="tmk-input" placeholder="05xxxxxxxx" dir="ltr">
                    </div>
                  </div>
                  <div class="form-row">
                    <div class="form-group">
                      <label>المصدر</label>
                      <select [(ngModel)]="leadForm.source" class="tmk-select">
                        <option value="whatsapp">واتساب</option>
                        <option value="referral">إحالة</option>
                        <option value="website">الموقع</option>
                        <option value="phone">اتصال هاتفي</option>
                        <option value="walk_in">زيارة مباشرة</option>
                        <option value="social_media">وسائل التواصل</option>
                      </select>
                    </div>
                    <div class="form-group">
                      <label>نوع الاستشارة</label>
                      <input [(ngModel)]="leadForm.consultationType" class="tmk-input" placeholder="مثال: نزاع تجاري">
                    </div>
                  </div>
                  <div class="form-group">
                    <label>ملاحظات</label>
                    <textarea [(ngModel)]="leadForm.notes" class="tmk-textarea" rows="3" placeholder="تفاصيل الاستشارة..."></textarea>
                  </div>
                </div>
                <div class="modal-footer">
                  <button class="tmk-btn outline" (click)="closeQuickAction()">إلغاء</button>
                  <button class="tmk-btn primary" (click)="submitLead()" [disabled]="!leadForm.name || !leadForm.phone">حفظ الفرصة</button>
                </div>
              }

              <!-- ADD SESSION QUICK DIALOG -->
              @if (quickActionType() === 'session') {
                <div class="modal-header">
                  <h3>📅 جدولة جلسة جديدة</h3>
                  <button (click)="closeQuickAction()">✕</button>
                </div>
                <div class="modal-body">
                  <div class="form-group">
                    <label>القضية <span class="req">*</span></label>
                    <select [(ngModel)]="sessionForm.caseId" (ngModelChange)="onSessionCaseChange()" class="tmk-select">
                      <option value="">اختر القضية...</option>
                      @for (c of store.cases(); track c.id) {
                        <option [value]="c.id">{{ c.title }} — {{ store.clientName(c.clientId) }}</option>
                      }
                    </select>
                  </div>
                  <div class="form-row">
                    <div class="form-group">
                      <label>نوع الجلسة</label>
                      <select [(ngModel)]="sessionForm.type" class="tmk-select">
                        <option value="first_hearing">جلسة أولى</option>
                        <option value="hearing">جلسة مرافعة</option>
                        <option value="pleading">جلسة ترافع</option>
                        <option value="judgment">جلسة حكم</option>
                        <option value="appeal">جلسة استئناف</option>
                      </select>
                    </div>
                    <div class="form-group">
                      <label>العنوان</label>
                      <input [(ngModel)]="sessionForm.title" class="tmk-input" placeholder="عنوان الجلسة">
                    </div>
                  </div>
                  <div class="form-row">
                    <div class="form-group">
                      <label>التاريخ <span class="req">*</span></label>
                      <input type="date" [(ngModel)]="sessionForm.date" class="tmk-input">
                    </div>
                    <div class="form-group">
                      <label>الوقت</label>
                      <input type="time" [(ngModel)]="sessionForm.time" class="tmk-input" dir="ltr">
                    </div>
                  </div>
                  <div class="form-group">
                    <label>ملاحظات</label>
                    <textarea [(ngModel)]="sessionForm.notes" class="tmk-textarea" rows="2" placeholder="تجهيزات مطلوبة، ملاحظات..."></textarea>
                  </div>
                </div>
                <div class="modal-footer">
                  <button class="tmk-btn outline" (click)="closeQuickAction()">إلغاء</button>
                  <button class="tmk-btn primary" (click)="submitSession()" [disabled]="!sessionForm.caseId || !sessionForm.date">حفظ الجلسة</button>
                </div>
              }

              <!-- CREATE INVOICE QUICK DIALOG -->
              @if (quickActionType() === 'invoice') {
                <div class="modal-header">
                  <h3>🧾 فاتورة إلكترونية جديدة <span class="zatca-badge">🛡️ ZATCA</span></h3>
                  <button (click)="closeQuickAction()">✕</button>
                </div>
                <div class="modal-body">
                  <div class="form-row">
                    <div class="form-group">
                      <label>العميل <span class="req">*</span></label>
                      <select [(ngModel)]="invoiceForm.clientId" class="tmk-select">
                        <option value="">اختر العميل...</option>
                        @for (c of store.clients(); track c.id) {
                          <option [value]="c.id">{{ c.name }}</option>
                        }
                      </select>
                    </div>
                    <div class="form-group">
                      <label>القضية (اختياري)</label>
                      <select [(ngModel)]="invoiceForm.caseId" class="tmk-select">
                        <option value="">بدون ربط</option>
                        @for (c of store.cases(); track c.id) {
                          <option [value]="c.id">{{ c.title }}</option>
                        }
                      </select>
                    </div>
                  </div>
                  <div class="form-group">
                    <label>وصف الخدمة</label>
                    <input [(ngModel)]="invoiceForm.description" class="tmk-input" placeholder="مثال: أتعاب تمثيل قانوني">
                  </div>
                  <div class="form-row">
                    <div class="form-group">
                      <label>المبلغ (ر.س) <span class="req">*</span></label>
                      <input type="number" [(ngModel)]="invoiceForm.amount" class="tmk-input" dir="ltr" placeholder="0">
                    </div>
                    <div class="form-group">
                      <label>تاريخ الاستحقاق</label>
                      <input type="date" [(ngModel)]="invoiceForm.dueDate" class="tmk-input">
                    </div>
                  </div>
                  <!-- INVOICE PREVIEW -->
                  @if (invoiceForm.amount > 0) {
                    <div class="invoice-preview">
                      <div class="inv-row"><span>المبلغ الفرعي</span><strong>{{ fmtCurrency(invoiceForm.amount) }}</strong></div>
                      <div class="inv-row"><span>ضريبة القيمة المضافة (15%)</span><strong>{{ fmtCurrency(invoiceForm.amount * 0.15) }}</strong></div>
                      <div class="inv-row total"><span>الإجمالي</span><strong>{{ fmtCurrency(invoiceForm.amount * 1.15) }}</strong></div>
                    </div>
                  }
                </div>
                <div class="modal-footer">
                  <button class="tmk-btn outline" (click)="closeQuickAction()">إلغاء</button>
                  <button class="tmk-btn primary" (click)="submitInvoice()" [disabled]="!invoiceForm.clientId || !invoiceForm.amount">إصدار الفاتورة</button>
                </div>
              }

            </div>
          </div>
        }

      </div>
    </app-dashboard-layout>
  `,
  styles: [`
    .tmk-home { max-width: 1400px; margin: 0 auto; }

    /* ── Welcome ── */
    .welcome-section { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem; }
    .welcome-title { font-size: 2rem; font-weight: 800; margin: 0.5rem 0 0.25rem; color: var(--text-primary); }
    .gradient-text { background: linear-gradient(135deg, #10b981, #3b82f6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .welcome-sub { color: var(--text-secondary); font-size: 1.05rem; }
    .status-dot { display: flex; align-items: center; gap: 0.5rem; }
    .dot { width: 10px; height: 10px; border-radius: 50%; background: #10b981; display: inline-block; }
    .dot.pulse { animation: pulse 2s infinite; }
    @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
    .status-label { font-size: 0.85rem; color: var(--text-secondary); }
    .glass-card { background: rgba(255,255,255,0.7); backdrop-filter: blur(10px); border: 1px solid rgba(0,0,0,0.06); border-radius: 16px; padding: 0.75rem 1.25rem; display: flex; align-items: center; gap: 0.75rem; }
    .glass-card .icon { font-size: 1.25rem; }
    .glass-card strong { display: block; font-size: 0.9rem; color: var(--text-primary); }
    .glass-card small { font-size: 0.8rem; color: var(--text-secondary); }

    /* ── KPI Cards ── */
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.25rem; margin-bottom: 2rem; }
    @media (max-width: 900px) { .kpi-grid { grid-template-columns: repeat(2, 1fr); } }
    .kpi-card { position: relative; background: var(--card-bg, #fff); border-radius: 16px; padding: 1.5rem; overflow: hidden; text-decoration: none; color: inherit; transition: all 0.3s; border: 1px solid rgba(0,0,0,0.06); cursor: pointer; }
    .kpi-card:hover { transform: translateY(-4px); box-shadow: 0 12px 30px rgba(0,0,0,0.08); }
    .kpi-glow { position: absolute; top: -2rem; right: -2rem; width: 6rem; height: 6rem; border-radius: 50%; opacity: 0.15; filter: blur(20px); transition: all 0.3s; }
    .kpi-card:hover .kpi-glow { opacity: 0.25; transform: scale(1.5); }
    .kpi-body { position: relative; display: flex; justify-content: space-between; align-items: flex-start; }
    .kpi-info { display: flex; flex-direction: column; gap: 0.25rem; }
    .kpi-label { font-size: 0.85rem; color: var(--text-secondary); font-weight: 500; }
    .kpi-value { font-size: 1.75rem; font-weight: 800; color: var(--text-primary); }
    .kpi-change { font-size: 0.75rem; font-weight: 500; }
    .kpi-change.positive { color: #10b981; }
    .kpi-change.negative { color: #ef4444; }
    .kpi-icon { width: 3rem; height: 3rem; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; color: white; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }

    /* ── Live Metrics ── */
    .live-section { margin-bottom: 2rem; }

    /* ═══ CHARTS ═══ */
    .charts-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1.5rem; margin-bottom: 2rem; }
    @media (max-width: 1100px) { .charts-grid { grid-template-columns: 1fr 1fr; } }
    @media (max-width: 700px) { .charts-grid { grid-template-columns: 1fr; } }
    .chart-card .section-header { padding: 1rem 1.25rem 0; border-bottom: none; }
    .chart-card .section-header.compact h3 { font-size: 0.95rem; }
    .chart-wrap { padding: 0.75rem 1.25rem 1.25rem; position: relative; }
    .chart-wrap canvas { width: 100% !important; height: auto !important; display: block; }
    .doughnut-wrap { display: flex; align-items: center; gap: 1.5rem; }
    @media (max-width: 500px) { .doughnut-wrap { flex-direction: column; } }
    .doughnut-wrap canvas { max-width: 160px; flex-shrink: 0; }
    .chart-legend { display: flex; flex-direction: column; gap: 0.5rem; flex: 1; }
    .legend-item { display: flex; align-items: center; gap: 0.5rem; font-size: 0.8rem; }
    .legend-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
    .legend-label { flex: 1; color: var(--text-secondary, #6b7280); }
    .legend-item strong { color: var(--text-primary); font-size: 0.9rem; }
    .live-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
    .live-header h2 { font-size: 1.25rem; font-weight: 700; margin: 0; }
    .live-header .sub { font-size: 0.85rem; color: var(--text-secondary); margin: 0; }
    .live-badge { display: flex; align-items: center; gap: 0.4rem; font-size: 0.8rem; color: #10b981; background: rgba(16,185,129,0.1); padding: 0.35rem 0.75rem; border-radius: 20px; }
    .live-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; }
    @media (max-width: 900px) { .live-grid { grid-template-columns: repeat(2, 1fr); } }
    .live-card { background: var(--card-bg, #fff); border-radius: 12px; padding: 1.25rem; border: 1px solid rgba(0,0,0,0.06); transition: all 0.3s; }
    .live-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.06); }
    .live-label { font-size: 0.8rem; color: var(--text-secondary); display: block; }
    .live-value { font-size: 1.5rem; font-weight: 800; display: block; margin: 0.25rem 0; color: var(--text-primary); }
    .live-helper { font-size: 0.7rem; color: var(--text-secondary); }

    /* ── Main Grid ── */
    .main-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 2rem; }
    @media (max-width: 1000px) { .main-grid { grid-template-columns: 1fr; } }
    .main-column, .sidebar-column { display: flex; flex-direction: column; gap: 1.5rem; }

    /* ── Section Card ── */
    .section-card { background: var(--card-bg, #fff); border-radius: 16px; border: 1px solid rgba(0,0,0,0.06); overflow: hidden; }
    .section-header { display: flex; align-items: center; gap: 0.75rem; padding: 1.25rem 1.5rem; border-bottom: 1px solid rgba(0,0,0,0.05); }
    .section-header.compact { padding: 1rem 1.25rem; font-weight: 700; font-size: 1rem; }
    .section-header h3 { font-size: 1.1rem; font-weight: 700; margin: 0; }
    .section-header small { font-size: 0.8rem; color: var(--text-secondary); display: block; }
    .section-icon { width: 2.75rem; height: 2.75rem; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.25rem; flex-shrink: 0; }
    .section-icon.blue { background: linear-gradient(135deg, #3b82f6, #2563eb); box-shadow: 0 4px 12px rgba(59,130,246,0.3); }
    .section-icon.red { background: linear-gradient(135deg, #ef4444, #dc2626); box-shadow: 0 4px 12px rgba(239,68,68,0.3); }
    .section-icon.purple { background: linear-gradient(135deg, #8b5cf6, #7c3aed); box-shadow: 0 4px 12px rgba(139,92,246,0.3); }
    .link-btn { margin-right: auto; font-size: 0.85rem; color: #3b82f6; text-decoration: none; font-weight: 600; white-space: nowrap; }
    .link-btn:hover { text-decoration: underline; }

    /* ── Task Filter Tabs ── */
    .task-filter-tabs { display: flex; gap: 0.25rem; margin-right: auto; }
    .task-filter-tabs button { padding: 0.3rem 0.75rem; border: 1px solid rgba(0,0,0,0.08); border-radius: 6px; background: transparent; font-family: inherit; font-size: 0.75rem; cursor: pointer; color: var(--text-secondary); transition: all 0.2s; white-space: nowrap; }
    .task-filter-tabs button.active { background: #3b82f6; color: white; border-color: #3b82f6; }

    /* ── Tasks ── */
    .tasks-list { padding: 0.5rem; }
    .task-item { display: flex; align-items: flex-start; gap: 0.75rem; padding: 0.85rem 1rem; border-radius: 10px; transition: background 0.2s; margin-bottom: 2px; cursor: pointer; }
    .task-item:hover { background: rgba(0,0,0,0.02); }
    .task-item.overdue { background: rgba(239,68,68,0.04); }
    .task-priority { width: 4px; height: 100%; min-height: 2.5rem; border-radius: 4px; flex-shrink: 0; }
    .task-body { flex: 1; min-width: 0; }
    .task-title-row { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem; flex-wrap: wrap; }
    .task-title-row strong { font-size: 0.95rem; }
    .task-status-badge { padding: 0.15rem 0.5rem; border-radius: 4px; font-size: 0.7rem; font-weight: 600; }
    .ts-pending { background: rgba(245,158,11,0.1); color: #d97706; }
    .ts-in_progress { background: rgba(59,130,246,0.1); color: #2563eb; }
    .ts-completed { background: rgba(16,185,129,0.1); color: #059669; }
    .ts-rejected { background: rgba(239,68,68,0.1); color: #dc2626; }
    .task-meta { display: flex; flex-wrap: wrap; gap: 0.75rem; font-size: 0.8rem; color: var(--text-secondary); align-items: center; }
    .meta-link { color: #3b82f6; text-decoration: none; }
    .meta-link:hover { text-decoration: underline; }
    .text-red { color: #ef4444 !important; }
    .assignee-chip { display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.8rem; }
    .assignee-avatar { width: 1.35rem; height: 1.35rem; border-radius: 50%; color: white; display: flex; align-items: center; justify-content: center; font-size: 0.55rem; font-weight: 700; flex-shrink: 0; }
    .assignee-avatar.lg { width: 2rem; height: 2rem; font-size: 0.75rem; }
    .task-actions { display: flex; gap: 0.25rem; flex-shrink: 0; }
    .task-action-btn { width: 1.75rem; height: 1.75rem; border-radius: 6px; border: 1px solid rgba(0,0,0,0.1); background: transparent; cursor: pointer; font-size: 0.75rem; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
    .task-action-btn.approve:hover { border-color: #10b981; color: #10b981; background: rgba(16,185,129,0.1); }
    .task-action-btn.reject:hover { border-color: #ef4444; color: #ef4444; background: rgba(239,68,68,0.1); }
    .task-action-btn.complete:hover { border-color: #3b82f6; color: #3b82f6; background: rgba(59,130,246,0.1); }

    /* ── Task Detail ── */
    .task-detail-card { border: 2px solid rgba(59,130,246,0.15); }
    .close-detail { margin-right: auto; background: none; border: none; cursor: pointer; font-size: 1.1rem; color: var(--text-secondary); padding: 0.25rem; }
    .task-detail-body { padding: 1.25rem 1.5rem; }
    .task-detail-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-bottom: 1rem; }
    .detail-item label { display: block; font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 0.25rem; }
    .detail-item strong { font-size: 0.9rem; }
    .priority-badge { padding: 0.2rem 0.6rem; border-radius: 4px; color: white; font-size: 0.75rem; font-weight: 600; display: inline-block; }
    .assignee-detail { display: flex; align-items: center; gap: 0.5rem; }
    .assignee-detail strong { display: block; font-size: 0.85rem; }
    .assignee-detail small { font-size: 0.75rem; color: var(--text-secondary); }
    .muted { color: var(--text-secondary); font-size: 0.85rem; }
    .case-link { color: #3b82f6; text-decoration: none; font-weight: 600; font-size: 0.85rem; }
    .detail-description { margin-bottom: 1rem; }
    .detail-description label { display: block; font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 0.25rem; }
    .detail-description p { font-size: 0.9rem; margin: 0; line-height: 1.7; }
    .task-detail-actions { display: flex; gap: 0.5rem; }

    /* ── Sessions ── */
    .sessions-list { padding: 0.5rem; }
    .session-item { display: flex; align-items: center; gap: 1rem; padding: 1rem; border-radius: 12px; text-decoration: none; color: inherit; transition: all 0.2s; border: 1px solid transparent; margin-bottom: 0.4rem; cursor: pointer; }
    .session-item:hover { background: rgba(0,0,0,0.02); border-color: rgba(59,130,246,0.2); }
    .session-time-box { width: 4rem; height: 4rem; background: var(--card-bg, #fff); border: 1px solid rgba(0,0,0,0.1); border-radius: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; flex-shrink: 0; transition: all 0.2s; }
    .session-item:hover .session-time-box { border-color: #3b82f6; box-shadow: 0 2px 8px rgba(59,130,246,0.15); }
    .session-hour { font-size: 1.5rem; font-weight: 800; color: #3b82f6; line-height: 1; }
    .session-ampm { font-size: 0.65rem; color: var(--text-secondary); }
    .session-body { flex: 1; min-width: 0; }
    .session-body strong { display: block; font-size: 0.95rem; margin-bottom: 0.25rem; }
    .session-meta { display: flex; flex-wrap: wrap; gap: 0.75rem; font-size: 0.8rem; color: var(--text-secondary); }
    .meta-case { color: #8b5cf6; }
    .session-badge { font-size: 0.75rem; padding: 0.25rem 0.75rem; border-radius: 20px; background: rgba(16,185,129,0.1); color: #10b981; font-weight: 600; border: 1px solid rgba(16,185,129,0.2); white-space: nowrap; }

    /* ── Activity ── */
    .activity-timeline { padding: 1rem 1.5rem; border-right: 2px solid rgba(0,0,0,0.08); margin-right: 1rem; }
    .activity-item { position: relative; padding-right: 2rem; margin-bottom: 1.5rem; }
    .activity-dot { position: absolute; right: -1.35rem; top: 0.25rem; width: 12px; height: 12px; border-radius: 50%; border: 3px solid var(--card-bg, #fff); }
    .activity-content strong { font-size: 0.9rem; display: block; }
    .activity-content p { font-size: 0.8rem; color: var(--text-secondary); margin: 0.15rem 0; }
    .activity-content small { font-size: 0.75rem; color: var(--text-secondary); opacity: 0.7; }

    /* ── Quick Actions ── */
    .quick-actions { padding: 0.75rem; display: flex; flex-direction: column; gap: 0.4rem; }
    .qa-btn { display: flex; align-items: center; gap: 0.75rem; width: 100%; padding: 0.75rem 1rem; border-radius: 10px; border: 1px solid rgba(0,0,0,0.08); background: transparent; cursor: pointer; font-size: 0.9rem; font-weight: 500; color: var(--text-primary); transition: all 0.2s; font-family: inherit; }
    .qa-btn:hover { border-color: rgba(59,130,246,0.3); background: rgba(59,130,246,0.05); }
    .qa-btn.primary { background: #3b82f6; color: white; border-color: #3b82f6; font-weight: 600; }
    .qa-btn.primary:hover { background: #2563eb; }
    .qa-btn.whatsapp { background: #25D366; color: white; border-color: #25D366; }
    .qa-btn.whatsapp:hover { background: #20BD5A; }

    /* ── Performance ── */
    .perf-list { padding: 0.75rem; }
    .perf-item { display: flex; align-items: center; gap: 0.75rem; padding: 0.6rem 0.75rem; border-radius: 10px; background: rgba(0,0,0,0.02); margin-bottom: 0.4rem; }
    .perf-icon { font-size: 1.2rem; }
    .perf-info { flex: 1; }
    .perf-info small { display: block; font-size: 0.75rem; color: var(--text-secondary); }
    .perf-info strong { font-size: 0.95rem; color: var(--text-primary); }

    /* ── Financial Summary ── */
    .fin-summary { padding: 1rem 1.25rem; }
    .fin-row { display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0; font-size: 0.9rem; }
    .fin-row.main { font-weight: 700; }
    .fin-row span { color: var(--text-secondary); }
    .text-green { color: #10b981 !important; }
    .text-orange { color: #f59e0b !important; }
    .fin-divider { height: 1px; background: rgba(0,0,0,0.06); margin: 0.5rem 0; }
    .fin-link { display: block; text-align: center; padding: 0.75rem; margin-top: 0.5rem; font-size: 0.85rem; color: #3b82f6; text-decoration: none; border-top: 1px solid rgba(0,0,0,0.05); font-weight: 600; }

    /* ── Alerts ── */
    .alerts-card { border-color: rgba(239,68,68,0.2); }
    .alert-header { background: rgba(239,68,68,0.03); }
    .alerts-list { padding: 0.5rem; }
    .alert-item { display: flex; gap: 0.75rem; padding: 0.75rem; border-radius: 8px; margin-bottom: 0.3rem; }
    .alert-item.severity-critical { background: rgba(239,68,68,0.05); }
    .alert-item.severity-warning { background: rgba(245,158,11,0.05); }
    .alert-icon { font-size: 1rem; flex-shrink: 0; }
    .alert-body strong { font-size: 0.85rem; display: block; }
    .alert-body small { font-size: 0.75rem; color: var(--text-secondary); }

    /* ── Empty State ── */
    .empty-state { text-align: center; padding: 2rem; }
    .empty-icon { font-size: 2.5rem; display: block; margin-bottom: 0.5rem; opacity: 0.5; }
    .empty-state p { color: var(--text-secondary); font-size: 0.9rem; }

    /* ── Modal / Dialog System ── */
    .tmk-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); z-index: 1000; display: flex; align-items: center; justify-content: center; animation: fadeIn 0.2s; }
    .tmk-modal { background: var(--card-bg, #fff); border-radius: 16px; width: 90%; max-height: 90vh; overflow-y: auto; animation: modalIn 0.3s; }
    .tmk-modal.large { max-width: 700px; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes modalIn { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
    .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 1.5rem; border-bottom: 1px solid rgba(0,0,0,0.08); background: rgba(0,0,0,0.01); }
    .modal-header h3 { font-size: 1.15rem; font-weight: 700; margin: 0; display: flex; align-items: center; gap: 0.5rem; }
    .modal-header button { background: none; border: none; font-size: 1.25rem; cursor: pointer; color: var(--text-secondary); padding: 0.25rem; }
    .modal-body { padding: 1.5rem; }
    .modal-footer { display: flex; justify-content: flex-end; gap: 0.75rem; padding: 1rem 1.5rem; border-top: 1px solid rgba(0,0,0,0.08); background: rgba(0,0,0,0.01); }
    .wizard-footer { justify-content: space-between; }

    /* ── Wizard Steps ── */
    .wizard-steps { display: flex; justify-content: center; gap: 2rem; margin-bottom: 2rem; padding-bottom: 1rem; border-bottom: 1px solid rgba(0,0,0,0.05); }
    .wizard-step { display: flex; flex-direction: column; align-items: center; gap: 0.4rem; }
    .step-circle { width: 2.5rem; height: 2.5rem; border-radius: 50%; border: 2px solid #d1d5db; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.9rem; transition: all 0.3s; color: #9ca3af; }
    .wizard-step.active .step-circle { border-color: #3b82f6; background: #3b82f6; color: white; transform: scale(1.1); box-shadow: 0 4px 12px rgba(59,130,246,0.3); }
    .wizard-step.done .step-circle { border-color: #3b82f6; background: rgba(59,130,246,0.1); color: #3b82f6; }
    .wizard-step span { font-size: 0.75rem; color: var(--text-secondary); }
    .wizard-step.active span { color: #3b82f6; font-weight: 600; }

    /* ── Form Elements ── */
    .form-section { animation: slideIn 0.3s ease; }
    @keyframes slideIn { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: translateX(0); } }
    .form-group { margin-bottom: 1rem; }
    .form-group label { display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.4rem; color: var(--text-primary); }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .req { color: #ef4444; }
    .tmk-input, .tmk-select, .tmk-textarea { width: 100%; padding: 0.65rem 0.85rem; border: 1px solid rgba(0,0,0,0.15); border-radius: 8px; font-family: inherit; font-size: 0.9rem; background: var(--card-bg, #fff); color: var(--text-primary); transition: border-color 0.2s; box-sizing: border-box; }
    .tmk-input:focus, .tmk-select:focus, .tmk-textarea:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
    .tmk-select.highlighted { border-color: rgba(59,130,246,0.3); background: rgba(59,130,246,0.03); }
    .tmk-input.border-red { border-color: rgba(239,68,68,0.4); }
    .tmk-input.mono { font-family: 'Courier New', monospace; }
    .form-hint { font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.3rem; display: block; }

    /* ── Role Picker ── */
    .role-picker { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .role-card { display: flex; flex-direction: column; align-items: center; padding: 1.25rem; border: 2px solid rgba(0,0,0,0.1); border-radius: 12px; cursor: pointer; transition: all 0.2s; text-align: center; }
    .role-card:hover { background: rgba(0,0,0,0.02); }
    .role-card.selected { border-color: #3b82f6; background: rgba(59,130,246,0.05); }
    .role-icon { font-size: 1.5rem; margin-bottom: 0.5rem; }
    .role-card strong { font-size: 0.95rem; }
    .role-card small { font-size: 0.75rem; color: var(--text-secondary); }

    /* ── Smart Alert ── */
    .smart-alert { display: flex; gap: 0.75rem; padding: 1rem; border-radius: 10px; border: 1px solid rgba(245,158,11,0.3); background: rgba(245,158,11,0.05); margin-bottom: 1.5rem; }
    .smart-icon { font-size: 1.25rem; }
    .smart-alert strong { display: block; font-size: 0.9rem; color: #92400e; margin-bottom: 0.25rem; }
    .smart-alert p { font-size: 0.85rem; color: #78350f; margin: 0; }

    .ai-hint { display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1rem; border-radius: 8px; border: 1px dashed rgba(59,130,246,0.3); background: rgba(59,130,246,0.03); font-size: 0.85rem; color: #3b82f6; opacity: 0.7; margin-top: 0.5rem; }

    /* ── Buttons ── */
    .tmk-btn { padding: 0.6rem 1.5rem; border-radius: 8px; border: none; font-family: inherit; font-size: 0.9rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
    .tmk-btn.primary { background: #3b82f6; color: white; }
    .tmk-btn.primary:hover { background: #2563eb; }
    .tmk-btn.primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .tmk-btn.outline { background: transparent; border: 1px solid rgba(0,0,0,0.15); color: var(--text-primary); }
    .tmk-btn.outline:hover { background: rgba(0,0,0,0.03); }
    .tmk-btn.outline:disabled { opacity: 0.4; }

    /* ── Invoice Preview ── */
    .invoice-preview { background: rgba(0,0,0,0.02); border-radius: 10px; padding: 1rem; margin-top: 1rem; border: 1px solid rgba(0,0,0,0.06); }
    .inv-row { display: flex; justify-content: space-between; padding: 0.4rem 0; font-size: 0.9rem; }
    .inv-row.total { border-top: 2px solid rgba(0,0,0,0.1); padding-top: 0.75rem; margin-top: 0.5rem; font-size: 1.1rem; color: #3b82f6; }

    .zatca-badge { font-size: 0.7rem; background: rgba(16,185,129,0.1); color: #10b981; padding: 0.2rem 0.5rem; border-radius: 6px; font-weight: 700; }
    .text-red { color: #ef4444; }

    /* ── Dark Mode ── */
    :host-context([data-theme="dark"]) {
      .glass-card { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.08); }
      .kpi-card { background: var(--card-bg); border-color: var(--border-light, #384250); }
      .kpi-card:hover { box-shadow: 0 12px 30px rgba(0,0,0,0.2); }
      .live-card { background: var(--card-bg); border-color: var(--border-light, #384250); }
      .section-card { background: var(--card-bg); border-color: var(--border-light, #384250); }
      .section-header { border-color: var(--border-light, #384250); }
      .task-item:hover { background: rgba(255,255,255,0.03); }
      .session-item:hover { background: rgba(255,255,255,0.03); border-color: rgba(59,130,246,0.3); }
      .session-time-box { background: var(--card-bg); border-color: var(--border-light, #384250); }
      .activity-timeline { border-color: var(--border-light, #384250); }
      .activity-dot { border-color: var(--card-bg); }
      .qa-btn { border-color: var(--border-light, #384250); color: var(--text-primary); }
      .qa-btn:hover { border-color: rgba(59,130,246,0.3); background: rgba(59,130,246,0.08); }
      .perf-item { background: rgba(255,255,255,0.03); }
      .fin-divider { background: var(--border-light, #384250); }
      .fin-link { border-color: var(--border-light, #384250); }
      .tmk-modal { background: var(--card-bg); }
      .modal-header, .modal-footer { border-color: var(--border-light, #384250); }
      .tmk-input, .tmk-select, .tmk-textarea { background: var(--card-bg); color: var(--text-primary); border-color: var(--border-light, #384250); }
      .wizard-steps { border-color: var(--border-light, #384250); }
      .role-card { border-color: var(--border-light, #384250); }
      .role-card:hover { background: rgba(255,255,255,0.03); }
      .invoice-preview { background: rgba(255,255,255,0.03); border-color: var(--border-light, #384250); }
      .tmk-btn.outline { border-color: var(--border-light, #384250); color: var(--text-primary); }
      .smart-alert { background: rgba(245,158,11,0.08); border-color: rgba(245,158,11,0.15); }
    }
  `]
})
export class HomeComponent implements OnInit, OnDestroy, AfterViewInit {
  store = inject(StoreService);
  private activityLog = inject(ActivityLogService);
  private financeEngine = inject(FinanceEngineService);
  private liveInterval: any;

  // Canvas chart references
  @ViewChild('revenueChart') revenueChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('caseChart') caseChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('barChart') barChartRef!: ElementRef<HTMLCanvasElement>;

  // Chart data
  caseDistribution = computed(() => {
    const cases = this.store.cases();
    return [
      { label: 'نشطة', count: cases.filter(c => c.status === 'active').length, color: '#17B26A' },
      { label: 'معلقة', count: cases.filter(c => c.status === 'pending').length, color: '#F79009' },
      { label: 'مغلقة', count: cases.filter(c => c.status === 'closed').length, color: '#6C737F' },
      { label: 'مستأنفة', count: cases.filter(c => c.status === 'appealed').length, color: '#2E90FA' },
      { label: 'مؤرشفة', count: cases.filter(c => c.status === 'archived').length, color: '#9DA4AE' },
    ].filter(d => d.count > 0);
  });

  monthlyData = computed(() => {
    const invoices = this.store.invoices();
    const expenses = this.store.expenses();
    const months: { label: string; revenue: number; expense: number }[] = [];
    const arabicMonths = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = d.getMonth(); const y = d.getFullYear();
      const rev = invoices.filter(inv => {
        const id = new Date(inv.issueDate);
        return id.getMonth() === m && id.getFullYear() === y && inv.status !== 'cancelled';
      }).reduce((s, inv) => s + inv.paidAmount, 0);
      const exp = expenses.filter(e => {
        const ed = new Date(e.date);
        return ed.getMonth() === m && ed.getFullYear() === y;
      }).reduce((s, e) => s + e.amount, 0);
      months.push({ label: arabicMonths[m], revenue: rev, expense: exp });
    }
    return months;
  });

  todayName = new Date().toLocaleDateString('ar-SA', { weekday: 'long' });
  todayFull = new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });

  saudiCourts = SAUDI_COURTS;

  // ── Task Workflow State ──
  taskFilter = signal<string>('all');
  selectedTask = signal<any>(null);

  // ── Quick Action State ──
  quickActionType = signal<string | null>(null);
  caseStep = signal(1);

  caseSteps = [
    { id: 1, title: 'أطراف الدعوى' },
    { id: 2, title: 'التصنيف والمحكمة' },
    { id: 3, title: 'المواعيد والتنبيهات' },
  ];

  caseForm = { title: '', clientId: '', opponent: '', partyRole: 'plaintiff' as string, courtType: '', category: '', subtype: '', filingDate: new Date().toISOString().split('T')[0], agencyExpiry: '', najizNumber: '', description: '' };
  leadForm = { name: '', phone: '', source: 'whatsapp' as string, consultationType: '', notes: '' };
  sessionForm = { caseId: '', type: 'hearing' as string, title: '', date: '', time: '09:00', notes: '' };
  invoiceForm = { clientId: '', caseId: '', description: '', amount: 0, dueDate: '' };

  // ── Live Metrics ──
  private liveData = signal({ responseMins: 18, slaRate: 94, satisfaction: 4.6, backlog: 3 });

  liveMetrics = computed(() => {
    const d = this.liveData();
    return [
      { label: 'زمن الاستجابة', value: `${d.responseMins} دقيقة`, helper: 'متوسط آخر ساعة' },
      { label: 'الالتزام بالمواعيد', value: `${d.slaRate}%`, helper: 'مقارنة بالهدف 95%' },
      { label: 'رضا العملاء', value: `${d.satisfaction}/5`, helper: 'آخر 30 تقييماً' },
      { label: 'مهام متأخرة', value: `${d.backlog}`, helper: 'بحاجة للمعالجة' },
    ];
  });

  // ── KPI Cards - ALL FROM REAL STORE DATA ──
  kpiCards = computed(() => {
    const stats = this.store.dashboardStats();
    const pendingInvoices = this.store.invoices().filter(i => i.status === 'issued' || i.status === 'overdue');
    const pendingAmount = pendingInvoices.reduce((acc, inv) => acc + ((inv.total || 0) - (inv.paidAmount || 0)), 0);
    const overdueAmount = this.store.invoices().filter(i => i.status === 'overdue').reduce((acc, inv) => acc + ((inv.total || 0) - (inv.paidAmount || 0)), 0);
    const conversionRate = this.store.leads().length > 0 ? Math.round(this.store.leads().filter(l => l.status === 'converted').length / this.store.leads().length * 100) : 0;
    const activeTasks = this.store.tasks().filter(t => t.status !== 'completed' && t.status !== 'cancelled').length;
    const upcomingSessionsCount = this.store.getUpcomingSessions(7).length;
    return [
      { label: 'القضايا النشطة', value: stats.activeCases, change: `${stats.totalClients} عميل — ${upcomingSessionsCount} جلسة قادمة`, changeType: 'positive', icon: '⚖️', color: '#10b981', gradient: 'linear-gradient(135deg, #10b981, #059669)', href: '/cases' },
      { label: 'الفرص والتحويل', value: stats.newLeads, change: `نسبة التحويل ${conversionRate}٪ — ${activeTasks} مهمة فعّالة`, changeType: conversionRate > 30 ? 'positive' : 'neutral', icon: '👤', color: '#8b5cf6', gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', href: '/leads' },
      { label: 'الفواتير المعلقة', value: formatCurrency(pendingAmount), change: overdueAmount > 0 ? `⚠ متأخر: ${formatCurrency(overdueAmount)}` : 'لا توجد مبالغ متأخرة', changeType: overdueAmount > 0 ? 'negative' : 'positive', icon: '📄', color: '#f59e0b', gradient: 'linear-gradient(135deg, #f59e0b, #d97706)', href: '/finance/invoices' },
      { label: 'إجمالي الإيرادات', value: formatCurrency(stats.totalRevenue), change: `صافي: ${formatCurrency(stats.totalRevenue * 0.85)} — ضريبة: ${formatCurrency(stats.totalRevenue * 0.15)}`, changeType: 'positive', icon: '📈', color: '#3b82f6', gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)', href: '/finance/reports' },
    ];
  });

  // ── TASKS - With approval workflow ──
  allTasks = computed(() =>
    this.store.tasks()
      .filter(t => t.status !== 'completed')
      .sort((a, b) => new Date(a.dueDate ?? '').getTime() - new Date(b.dueDate ?? '').getTime())
  );

  pendingApprovalTasks = computed(() =>
    this.store.tasks().filter(t => t.status === 'pending')
  );

  displayedTasks = computed(() => {
    const filter = this.taskFilter();
    let tasks = this.store.tasks();
    if (filter === 'pending') tasks = tasks.filter(t => t.status === 'pending');
    else if (filter === 'in_progress') tasks = tasks.filter(t => t.status === 'in_progress');
    else if (filter === 'completed') tasks = tasks.filter(t => t.status === 'completed');
    else tasks = tasks.filter(t => t.status !== 'completed');
    return tasks.sort((a, b) => {
      const pOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
      return (pOrder[a.priority] ?? 2) - (pOrder[b.priority] ?? 2);
    }).slice(0, 8);
  });

  // ── SESSIONS - Linked to cases and clients ──
  upcomingSessions = computed(() => this.store.getUpcomingSessions(7).slice(0, 5));

  // ── ACTIVITY FEED - Real from store ──
  recentActivities = computed(() => {
    const activities: any[] = [];
    // Recent leads
    this.store.leads().slice(0, 2).forEach(lead => {
      activities.push({ id: 'l-' + lead.id, title: 'فرصة جديدة', description: `${lead.name} — ${lead.consultationType || 'استشارة'}`, time: formatRelativeDate(lead.createdAt), color: '#8b5cf6' });
    });
    // Recent paid invoices
    this.store.invoices().filter(i => i.status === 'paid').slice(0, 1).forEach(inv => {
      activities.push({ id: 'i-' + inv.id, title: 'تم سداد فاتورة', description: `${inv.invoiceNumber} — ${formatCurrency(inv.total)}`, time: formatRelativeDate(inv.createdAt), color: '#10b981' });
    });
    // Recent clients
    this.store.clients().slice(0, 1).forEach(client => {
      activities.push({ id: 'c-' + client.id, title: 'عميل جديد', description: `تم تسجيل ${client.name}`, time: formatRelativeDate(client.createdAt), color: '#06b6d4' });
    });
    // Recent cases
    this.store.cases().slice(0, 1).forEach(c => {
      activities.push({ id: 'cs-' + c.id, title: 'قضية جديدة', description: c.title, time: formatRelativeDate(c.createdAt), color: '#3b82f6' });
    });
    return activities.slice(0, 5);
  });

  // ── PERFORMANCE SUMMARY ──
  perfSummary = computed(() => {
    const stats = this.store.dashboardStats();
    const completedSessions = this.store.sessions().filter(s => s.status === 'completed').length;
    const convertedLeads = this.store.leads().filter(l => l.status === 'converted').length;
    const avgCaseValue = this.store.cases().length > 0 ? this.store.cases().reduce((acc, c) => acc + (c.agreedFee || 0), 0) / this.store.cases().length : 0;
    return [
      { icon: '👥', iconColor: '#10b981', label: 'العملاء المسجلين', value: String(stats.totalClients) },
      { icon: '✅', iconColor: '#3b82f6', label: 'الفرص المحوّلة', value: String(convertedLeads) },
      { icon: '⚖️', iconColor: '#8b5cf6', label: 'جلسات مكتملة', value: String(completedSessions) },
      { icon: '💰', iconColor: '#f59e0b', label: 'متوسط قيمة القضية', value: formatCurrency(avgCaseValue) },
    ];
  });

  // ── FINANCIAL SUMMARY ──
  finSummary = computed(() => {
    const invoices = this.store.invoices();
    const totalRevenue = invoices.filter(i => i.status === 'paid').reduce((acc, i) => acc + (i.total || 0), 0);
    const pendingAmount = invoices.filter(i => i.status === 'issued').reduce((acc, i) => acc + ((i.total || 0) - (i.paidAmount || 0)), 0);
    const overdueAmount = invoices.filter(i => i.status === 'overdue').reduce((acc, i) => acc + ((i.total || 0) - (i.paidAmount || 0)), 0);
    const totalExpenses = this.store.expenses().reduce((acc, e) => acc + e.amount, 0);
    return { totalRevenue, pendingAmount, overdueAmount, totalExpenses, netIncome: totalRevenue - totalExpenses };
  });

  // ── CRITICAL ALERTS ──
  criticalAlerts = computed(() =>
    this.store.alerts().filter(a => a.severity === 'critical' || a.severity === 'high').slice(0, 4)
  );

  ngOnInit() {
    // Live metrics simulation
    this.liveInterval = setInterval(() => {
      this.liveData.update(d => ({
        responseMins: Math.max(8, d.responseMins + Math.round(Math.random() * 4 - 2)),
        slaRate: Math.min(99, Math.max(85, d.slaRate + Math.round(Math.random() * 3 - 1))),
        satisfaction: Math.min(5, Math.max(4.2, +(d.satisfaction + (Math.random() * 0.2 - 0.1)).toFixed(1))),
        backlog: Math.max(1, d.backlog + Math.round(Math.random() * 2 - 1)),
      }));
    }, 3000);
    // Set default dates
    const thirtyDays = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
    this.invoiceForm.dueDate = thirtyDays;
  }

  ngOnDestroy() { clearInterval(this.liveInterval); }

  ngAfterViewInit() {
    setTimeout(() => {
      this.renderRevenueChart();
      this.renderCaseChart();
      this.renderBarChart();
    }, 100);
  }

  private renderRevenueChart() {
    const canvas = this.revenueChartRef?.nativeElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const data = this.monthlyData();
    const w = canvas.width; const h = canvas.height;
    const pad = { t: 20, r: 20, b: 40, l: 60 };
    const cw = w - pad.l - pad.r; const ch = h - pad.t - pad.b;
    ctx.clearRect(0, 0, w, h);
    const maxVal = Math.max(...data.map(d => d.revenue), 1000);
    const points: [number, number][] = data.map((d, i) => [
      pad.l + (i / Math.max(data.length - 1, 1)) * cw,
      pad.t + ch - (d.revenue / maxVal) * ch
    ]);
    // Grid lines
    ctx.strokeStyle = '#E5E7EB'; ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const y = pad.t + (ch / 4) * i;
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke();
      ctx.fillStyle = '#9DA4AE'; ctx.font = '11px IBM Plex Sans Arabic';
      ctx.textAlign = 'right'; ctx.fillText(formatCurrency(maxVal - (maxVal / 4) * i), pad.l - 8, y + 4);
    }
    // Area fill
    const grad = ctx.createLinearGradient(0, pad.t, 0, h - pad.b);
    grad.addColorStop(0, 'rgba(27,131,84,0.2)'); grad.addColorStop(1, 'rgba(27,131,84,0.01)');
    ctx.beginPath(); ctx.moveTo(points[0][0], h - pad.b);
    points.forEach(p => ctx.lineTo(p[0], p[1]));
    ctx.lineTo(points[points.length - 1][0], h - pad.b);
    ctx.closePath(); ctx.fillStyle = grad; ctx.fill();
    // Line with bezier
    ctx.beginPath(); ctx.strokeStyle = '#1B8354'; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
    if (points.length > 0) {
      ctx.moveTo(points[0][0], points[0][1]);
      for (let i = 1; i < points.length; i++) {
        const cx = (points[i - 1][0] + points[i][0]) / 2;
        ctx.bezierCurveTo(cx, points[i - 1][1], cx, points[i][1], points[i][0], points[i][1]);
      }
    }
    ctx.stroke();
    // Dots
    points.forEach(([x, y]) => {
      ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#1B8354'; ctx.lineWidth = 2; ctx.stroke();
    });
    // Labels
    ctx.fillStyle = '#6C737F'; ctx.font = '11px IBM Plex Sans Arabic'; ctx.textAlign = 'center';
    data.forEach((d, i) => ctx.fillText(d.label, points[i][0], h - pad.b + 20));
  }

  private renderCaseChart() {
    const canvas = this.caseChartRef?.nativeElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dist = this.caseDistribution();
    const total = dist.reduce((s, d) => s + d.count, 0) || 1;
    const cx = canvas.width / 2; const cy = canvas.height / 2;
    const r = Math.min(cx, cy) - 10; const ir = r * 0.6;
    let angle = -Math.PI / 2;
    dist.forEach(d => {
      const sweep = (d.count / total) * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(cx + ir * Math.cos(angle), cy + ir * Math.sin(angle));
      ctx.arc(cx, cy, r, angle, angle + sweep); ctx.arc(cx, cy, ir, angle + sweep, angle, true);
      ctx.closePath(); ctx.fillStyle = d.color; ctx.fill();
      angle += sweep;
    });
    // Center text
    ctx.fillStyle = '#111927'; ctx.font = 'bold 28px IBM Plex Sans Arabic';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(total), cx, cy - 8);
    ctx.fillStyle = '#6C737F'; ctx.font = '12px IBM Plex Sans Arabic'; ctx.fillText('قضية', cx, cy + 14);
  }

  private renderBarChart() {
    const canvas = this.barChartRef?.nativeElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const data = this.monthlyData();
    const w = canvas.width; const h = canvas.height;
    const pad = { t: 20, r: 20, b: 40, l: 60 };
    const cw = w - pad.l - pad.r; const ch = h - pad.t - pad.b;
    ctx.clearRect(0, 0, w, h);
    const maxVal = Math.max(...data.flatMap(d => [d.revenue, d.expense]), 1000);
    const barW = cw / data.length * 0.35;
    const gap = cw / data.length;
    // Grid
    ctx.strokeStyle = '#E5E7EB'; ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const y = pad.t + (ch / 4) * i;
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke();
      ctx.fillStyle = '#9DA4AE'; ctx.font = '11px IBM Plex Sans Arabic';
      ctx.textAlign = 'right'; ctx.fillText(formatCurrency(maxVal - (maxVal / 4) * i), pad.l - 8, y + 4);
    }
    // Bars
    data.forEach((d, i) => {
      const x = pad.l + i * gap + gap / 2;
      // Revenue bar (green)
      const rh = (d.revenue / maxVal) * ch;
      ctx.fillStyle = '#1B8354'; this.roundedRect(ctx, x - barW - 1, pad.t + ch - rh, barW, rh, 4);
      // Expense bar (red)
      const eh = (d.expense / maxVal) * ch;
      ctx.fillStyle = '#F04438'; this.roundedRect(ctx, x + 1, pad.t + ch - eh, barW, eh, 4);
      // Label
      ctx.fillStyle = '#6C737F'; ctx.font = '11px IBM Plex Sans Arabic';
      ctx.textAlign = 'center'; ctx.fillText(d.label, x, h - pad.b + 20);
    });
    // Legend
    ctx.fillStyle = '#1B8354'; ctx.fillRect(w - 120, 8, 10, 10);
    ctx.fillStyle = '#384250'; ctx.font = '10px IBM Plex Sans Arabic';
    ctx.textAlign = 'start'; ctx.fillText('إيرادات', w - 130, 17);
    ctx.fillStyle = '#F04438'; ctx.fillRect(w - 60, 8, 10, 10);
    ctx.fillStyle = '#384250'; ctx.fillText('مصروفات', w - 70, 17);
  }

  private roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    if (h < r) r = h / 2; if (w < r) r = w / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r); ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h); ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath(); ctx.fill();
  }

  // ── LINKING HELPERS ──
  getTaskCase(task: any) { return task.caseId ? this.store.getCase(task.caseId) : undefined; }
  getTaskAssignee(task: any) { return task.assignedTo ? this.store.getEmployee(task.assignedTo) : undefined; }
  getSessionCase(session: any) { return session.caseId ? this.store.getCase(session.caseId) : undefined; }
  getSessionClient(session: any) {
    const c = this.getSessionCase(session);
    return c ? this.store.getClient(c.clientId) : undefined;
  }

  // ── Formatters ──
  fmtCurrency = formatCurrency;
  fmtRelative = formatRelativeDate;
  fmtDate(d: string) { return new Date(d).toLocaleDateString('ar-SA', { weekday: 'short', month: 'short', day: 'numeric' }); }
  isOverdue(d: string) { return new Date(d) < new Date(); }
  getAmPm(time?: string) { return !time ? 'ص' : parseInt(time.split(':')[0]) < 12 ? 'صباحاً' : 'مساءً'; }
  getPriorityColor(p: string) { return p === 'urgent' ? '#ef4444' : p === 'high' ? '#f59e0b' : p === 'medium' ? '#3b82f6' : '#6b7280'; }

  // ── Quick Action Handlers ──
  openQuickAction(type: string) { this.quickActionType.set(type); this.caseStep.set(1); }
  closeQuickAction() { this.quickActionType.set(null); this.resetForms(); }
  openWhatsApp() { window.open('https://wa.me/', '_blank'); }

  selectTask(task: any) { this.selectedTask.set(task); }
  approveTask(id: string) { this.store.updateTask(id, { status: 'in_progress' as any }); this.selectedTask.set(null); }
  rejectTask(id: string) { this.store.updateTask(id, { status: 'completed' as any }); this.selectedTask.set(null); }
  completeTask(id: string) { this.store.updateTask(id, { status: 'completed' as any }); this.selectedTask.set(null); }
  getTaskStatusLabel(s: string) { return { pending: 'بانتظار الاعتماد', in_progress: 'قيد التنفيذ', completed: 'مكتملة', rejected: 'مرفوضة' }[s] || s; }
  getPriorityLabel(p: string) { return { urgent: 'عاجل', high: 'مرتفع', medium: 'متوسط', low: 'منخفض' }[p] || p; }

  // ── Case Wizard ──
  nextCaseStep() {
    if (this.caseStep() === 1 && (!this.caseForm.clientId || !this.caseForm.opponent)) return;
    if (this.caseStep() === 2 && (!this.caseForm.courtType || !this.caseForm.category || !this.caseForm.subtype)) return;
    this.caseStep.update(s => Math.min(s + 1, 3));
  }
  prevCaseStep() { this.caseStep.update(s => Math.max(s - 1, 1)); }

  onCourtChange() { this.caseForm.category = ''; this.caseForm.subtype = ''; }
  onCategoryChange() { this.caseForm.subtype = ''; }

  getCourtCategories() {
    const court = SAUDI_COURTS.find(c => c.id === this.caseForm.courtType);
    return court?.categories || [];
  }
  getCategorySubtypes() {
    const cats = this.getCourtCategories();
    const cat = cats.find((c: any) => c.id === this.caseForm.category);
    return cat?.subtypes || [];
  }
  getSelectedSubtype() {
    const subs = this.getCategorySubtypes();
    return subs.find((s: any) => s.id === this.caseForm.subtype);
  }

  submitCase() {
    if (!this.caseForm.title || !this.caseForm.clientId) return;
    const id = this.store.generateId('CASE');
    this.store.addCase({
      id, title: this.caseForm.title, clientId: this.caseForm.clientId,
      status: 'active', courtType: this.caseForm.courtType as any, caseCategory: this.caseForm.category,
      caseSubCategory: this.caseForm.subtype, partyRole: this.caseForm.partyRole as any,
      opponents: this.caseForm.opponent ? [this.caseForm.opponent] : [],
      filingDate: this.caseForm.filingDate, agencyExpiry: this.caseForm.agencyExpiry,
      najizNumber: this.caseForm.najizNumber, description: this.caseForm.description,
      agreedFee: 0, paidAmount: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    } as any);
    this.closeQuickAction();
  }

  submitLead() {
    if (!this.leadForm.name || !this.leadForm.phone) return;
    this.store.addLead({
      id: this.store.generateId('LEAD'), name: this.leadForm.name, phone: this.leadForm.phone,
      status: 'intake', source: this.leadForm.source as any, type: 'individual',
      consultationType: this.leadForm.consultationType, consultationNotes: this.leadForm.notes,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    } as any);
    this.closeQuickAction();
  }

  submitSession() {
    if (!this.sessionForm.caseId || !this.sessionForm.date) return;
    const caseData = this.store.getCase(this.sessionForm.caseId);
    this.store.addSession({
      id: this.store.generateId('SES'), caseId: this.sessionForm.caseId,
      clientId: caseData?.clientId || '', type: this.sessionForm.type as any,
      title: this.sessionForm.title || 'جلسة', date: this.sessionForm.date,
      time: this.sessionForm.time, status: 'scheduled', notes: this.sessionForm.notes,
      courtBranch: '', courtRoom: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    } as any);
    this.closeQuickAction();
  }

  onSessionCaseChange() {
    // Auto-link client from case
  }

  submitInvoice() {
    if (!this.invoiceForm.clientId || !this.invoiceForm.amount) return;
    const subtotal = this.invoiceForm.amount;
    const vat = subtotal * 0.15;
    const total = subtotal + vat;
    this.store.addInvoice({
      id: this.store.generateId('INV'),
      invoiceNumber: `INV-${new Date().getFullYear()}-${String(this.store.invoices().length + 1).padStart(3, '0')}`,
      clientId: this.invoiceForm.clientId, caseId: this.invoiceForm.caseId || undefined,
      subtotal, vatAmount: vat, total, status: 'issued', paidAmount: 0,
      issueDate: new Date().toISOString().split('T')[0], dueDate: this.invoiceForm.dueDate,
      items: [{ description: this.invoiceForm.description || 'خدمات قانونية', quantity: 1, unitPrice: subtotal, amount: subtotal, vatRate: 15, vatAmount: vat }],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    } as any);
    this.closeQuickAction();
  }

  private resetForms() {
    this.caseForm = { title: '', clientId: '', opponent: '', partyRole: 'plaintiff', courtType: '', category: '', subtype: '', filingDate: new Date().toISOString().split('T')[0], agencyExpiry: '', najizNumber: '', description: '' };
    this.leadForm = { name: '', phone: '', source: 'whatsapp', consultationType: '', notes: '' };
    this.sessionForm = { caseId: '', type: 'hearing', title: '', date: '', time: '09:00', notes: '' };
    this.invoiceForm = { clientId: '', caseId: '', description: '', amount: 0, dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0] };
    this.caseStep.set(1);
  }
}
