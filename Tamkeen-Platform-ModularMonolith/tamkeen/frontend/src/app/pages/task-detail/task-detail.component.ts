import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DashboardLayoutComponent } from '../../layouts/dashboard/dashboard-layout.component';
import { StoreService } from '../../core/services/store.service';

@Component({
  selector: 'app-task-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DashboardLayoutComponent],
  template: `
    <app-dashboard-layout>
      <div class="dga-page" dir="rtl">
        <nav class="dga-breadcrumb">
          <a routerLink="/home">استعراض</a>
          <span class="sep">‹</span>
          <a routerLink="/tasks">المهام</a>
          <span class="sep">‹</span>
          <span>{{ task()?.title || 'تفاصيل المهمة' }}</span>
        </nav>

        @if (task(); as t) {
          <div class="dga-page-title">
            <h1>{{ t.title }}</h1>
            <a routerLink="/tasks" class="back-link">رجوع →</a>
          </div>

          <div class="dga-layout">
            <div class="dga-main">
              <div class="dga-content-card">
                <!-- Task Info -->
                <div class="detail-section">
                  <h2 class="section-title">
                    <i class="bi bi-info-circle"></i> معلومات المهمة
                  </h2>
                  <div class="info-grid">
                    <div class="info-item">
                      <label>الحالة</label>
                      <span class="status-badge" [class]="'badge-' + t.status">{{ getStatusLabel(t.status) }}</span>
                    </div>
                    <div class="info-item">
                      <label>الأولوية</label>
                      <span class="priority-badge" [class]="'pri-' + t.priority">{{ getPriorityLabel(t.priority) }}</span>
                    </div>
                    <div class="info-item">
                      <label>المسؤول</label>
                      <span>{{ store.employeeName(t.assignedTo) }}</span>
                    </div>
                    <div class="info-item">
                      <label>القضية</label>
                      <a [routerLink]="['/cases', t.caseId]">{{ getCaseTitle(t.caseId) }}</a>
                    </div>
                    <div class="info-item">
                      <label>تاريخ الإنشاء</label>
                      <span>{{ t.createdAt | date:'d MMMM yyyy':'':'ar' }}</span>
                    </div>
                    <div class="info-item">
                      <label>الموعد النهائي</label>
                      <span [class.overdue]="isOverdue(t)">{{ t.dueDate | date:'d MMMM yyyy':'':'ar' }}</span>
                    </div>
                  </div>
                </div>

                <!-- Description -->
                @if (t.description) {
                  <div class="detail-section">
                    <h2 class="section-title">
                      <i class="bi bi-text-paragraph"></i> الوصف
                    </h2>
                    <p class="description">{{ t.description }}</p>
                  </div>
                }

                <!-- Return Reason -->
                @if (t.status === 'returned' && t.returnReason) {
                  <div class="detail-section return-section">
                    <h2 class="section-title">
                      <i class="bi bi-exclamation-triangle"></i> سبب الإرجاع
                    </h2>
                    <div class="return-box">{{ t.returnReason }}</div>
                  </div>
                }

                <!-- Revision History -->
                @if (t.revisions && t.revisions.length > 0) {
                  <div class="detail-section">
                    <h2 class="section-title">
                      <i class="bi bi-clock-history"></i> سجل المراجعات
                    </h2>
                    <div class="revision-list">
                      @for (rev of t.revisions; track rev.version) {
                        <div class="revision-item">
                          <div class="rev-header">
                            <span class="rev-version">v{{ rev.version }}</span>
                            <span class="rev-date">{{ rev.submittedAt | date:'d MMM yyyy HH:mm':'':'ar' }}</span>
                          </div>
                          @if (rev.note) {
                            <p class="rev-note">{{ rev.note }}</p>
                          }
                        </div>
                      }
                    </div>
                  </div>
                }

                <!-- Actions -->
                <div class="detail-actions">
                  @if (isManager()) {
                    @if (t.status === 'submitted') {
                      <button class="btn-success" (click)="approve()">
                        <i class="bi bi-check-lg"></i> اعتماد (Merge)
                      </button>
                      <button class="btn-warning" (click)="returnTask()">
                        <i class="bi bi-arrow-return-left"></i> إرجاع
                      </button>
                    }
                  } @else {
                    @if (t.status === 'in_progress' && t.assignedTo === store.currentUser()?.id) {
                      <button class="btn-primary" (click)="submit()">
                        <i class="bi bi-send"></i> تسليم للمراجعة
                      </button>
                    }
                  }
                </div>
              </div>
            </div>

            <div class="dga-sidebar">
              <div class="sidebar-card">
                <div class="sidebar-section-title">
                  <i class="bi bi-activity"></i>
                  <span>حالة المهمة</span>
                </div>
                <div class="timeline">
                  <div class="tl-item" [class.done]="true">
                    <div class="tl-dot"></div>
                    <span>تم الإنشاء</span>
                  </div>
                  <div class="tl-item" [class.done]="t.status !== 'pending'">
                    <div class="tl-dot"></div>
                    <span>قيد التنفيذ</span>
                  </div>
                  <div class="tl-item" [class.done]="t.status === 'submitted' || t.status === 'completed'">
                    <div class="tl-dot"></div>
                    <span>تم التسليم</span>
                  </div>
                  <div class="tl-item" [class.done]="t.status === 'completed'">
                    <div class="tl-dot"></div>
                    <span>تم الاعتماد</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        } @else {
          <div class="empty-state">
            <i class="bi bi-kanban"></i>
            <p>المهمة غير موجودة</p>
          </div>
        }
      </div>
    </app-dashboard-layout>
  `,
  styles: [`
    .detail-section { padding:24px; border-bottom:1px solid #f0f0f0; }
    .section-title { font-size:16px; font-weight:600; color:#1a1a2e; margin:0 0 16px;
                     display:flex; align-items:center; gap:8px; }
    .section-title i { color:#1a7a4c; }
    .info-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(240px, 1fr)); gap:16px; }
    .info-item label { display:block; font-size:12px; color:#888; margin-bottom:4px; }
    .info-item span, .info-item a { font-size:14px; color:#1a1a2e; font-weight:500; }
    .info-item a { color:#1a7a4c; text-decoration:none; }
    .overdue { color:#dc3545!important; }
    .description { color:#555; line-height:1.8; font-size:14px; margin:0; }
    .return-section { background:#fff5f5; }
    .return-box { background:#fed7d7; border-radius:8px; padding:14px; color:#c53030; font-size:14px; }
    .revision-list { display:flex; flex-direction:column; gap:12px; }
    .revision-item { background:#f9f9f9; border-radius:8px; padding:12px 16px; }
    .rev-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; }
    .rev-version { background:#1a7a4c; color:#fff; padding:2px 10px; border-radius:10px; font-size:12px; }
    .rev-date { color:#888; font-size:12px; }
    .rev-note { color:#555; font-size:13px; margin:0; }
    .detail-actions { padding:24px; display:flex; gap:12px; }

    .status-badge { font-size:12px; padding:4px 12px; border-radius:12px; font-weight:500; }
    .badge-pending { background:#e3f2fd; color:#1565c0; }
    .badge-in_progress { background:#fff3e0; color:#e65100; }
    .badge-submitted { background:#fff8e1; color:#f57f17; }
    .badge-returned { background:#fde8ea; color:#c62828; }
    .badge-completed { background:#e8f5e9; color:#2e7d32; }
    .priority-badge { font-size:12px; padding:4px 12px; border-radius:12px; font-weight:600; }
    .pri-critical { background:#fde8ea; color:#dc3545; }
    .pri-high { background:#fff3e0; color:#e65100; }
    .pri-medium { background:#fff8e1; color:#f57f17; }
    .pri-low { background:#e8f5e9; color:#2e7d32; }

    .btn-success { background:#28a745; color:#fff; border:none; padding:10px 20px; border-radius:8px;
                   cursor:pointer; font-size:14px; display:flex; align-items:center; gap:6px; }
    .btn-warning { background:#ffc107; color:#333; border:none; padding:10px 20px; border-radius:8px;
                   cursor:pointer; font-size:14px; display:flex; align-items:center; gap:6px; }
    .btn-primary { background:#1a7a4c; color:#fff; border:none; padding:10px 20px; border-radius:8px;
                   cursor:pointer; font-size:14px; display:flex; align-items:center; gap:6px; }

    .timeline { padding:8px 0; }
    .tl-item { display:flex; align-items:center; gap:12px; padding:10px 0; position:relative;
               color:#aaa; font-size:13px; }
    .tl-item.done { color:#1a7a4c; }
    .tl-dot { width:12px; height:12px; border-radius:50%; border:2px solid #ddd; background:#fff; }
    .tl-item.done .tl-dot { border-color:#1a7a4c; background:#1a7a4c; }

    .empty-state { text-align:center; padding:80px 20px; color:#999; }
    .empty-state i { font-size:48px; display:block; margin-bottom:16px; }
  `]
})
export class TaskDetailComponent {
  store = inject(StoreService);
  private route = inject(ActivatedRoute);

  taskId = signal('');

  constructor() {
    this.route.params.subscribe(p => this.taskId.set(p['id']));
  }

  task = computed(() => this.store.tasks().find(t => t.id === this.taskId()));

  isManager = computed(() => {
    const role = this.store.currentUser()?.role;
    return role === 'admin' || role === 'senior_lawyer';
  });

  getCaseTitle(caseId: string): string {
    return this.store.cases().find(c => c.id === caseId)?.title || '—';
  }

  getStatusLabel(s: string): string {
    const map: Record<string, string> = {
      pending: 'معلّقة', in_progress: 'قيد الإنجاز', submitted: 'بانتظار المراجعة',
      returned: 'مُرتجعة', completed: 'مكتملة', cancelled: 'ملغاة'
    };
    return map[s] || s;
  }

  getPriorityLabel(p: string): string {
    const map: Record<string, string> = { low: 'منخفضة', medium: 'متوسطة', high: 'عالية', critical: 'حرجة' };
    return map[p] || p;
  }

  isOverdue(t: any): boolean {
    return new Date(t.dueDate) < new Date() && t.status !== 'completed';
  }

  approve(): void {
    const t = this.task();
    if (t) this.store.updateTask(t.id, { status: 'completed', completedAt: new Date().toISOString() });
  }

  returnTask(): void {
    const t = this.task();
    if (!t) return;
    const reason = prompt('سبب الإرجاع:');
    if (reason) this.store.updateTask(t.id, { status: 'returned', returnReason: reason });
  }

  submit(): void {
    const t = this.task();
    if (t) this.store.updateTask(t.id, { status: 'submitted' });
  }
}
