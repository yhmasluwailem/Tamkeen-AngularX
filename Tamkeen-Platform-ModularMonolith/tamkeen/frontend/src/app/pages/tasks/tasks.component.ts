import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DashboardLayoutComponent } from '../../layouts/dashboard/dashboard-layout.component';
import { StoreService } from '../../core/services/store.service';
import { Task } from '../../core/models';

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DashboardLayoutComponent],
  template: `
    <app-dashboard-layout>
      <div class="dga-page" dir="rtl">
        <nav class="dga-breadcrumb">
          <a routerLink="/home">استعراض</a>
          <span class="sep">‹</span>
          <span>إدارة المهام</span>
        </nav>

        <div class="dga-page-title">
          <h1>إدارة المهام</h1>
          <div class="title-actions">
            @if (store.currentUser()?.role === 'admin' || store.currentUser()?.role === 'senior_lawyer') {
              <button class="btn-primary" (click)="showCreateModal = true">
                <i class="bi bi-plus-lg"></i> إنشاء مهمة جديدة
              </button>
            }
            <a routerLink="/home" class="back-link">رجوع →</a>
          </div>
        </div>

        <div class="dga-layout">
          <div class="dga-main">
            <div class="dga-content-card">
              <!-- Search & Filter -->
              <div class="search-header">
                <div class="search-title">
                  <i class="bi bi-kanban"></i>
                  <span>المهام</span>
                </div>
                <span class="case-count">{{ filtered().length }} مهمة</span>
              </div>

              <div class="search-bar">
                <div class="search-input-wrap">
                  <input class="search-input" [ngModel]="search()" (ngModelChange)="search.set($event)"
                         placeholder="ابحث في المهام...">
                  <i class="bi bi-search search-icon"></i>
                </div>
              </div>

              <!-- Tab Filters -->
              <div class="tab-filters">
                <button class="tab-btn" [class.active]="activeTab() === 'all'" (click)="activeTab.set('all')">
                  الكل <span class="tab-count">{{ store.tasks().length }}</span>
                </button>
                <button class="tab-btn" [class.active]="activeTab() === 'pending'" (click)="activeTab.set('pending')">
                  قيد الإنجاز <span class="tab-count">{{ countByStatus('in_progress') }}</span>
                </button>
                <button class="tab-btn" [class.active]="activeTab() === 'review'" (click)="activeTab.set('review')">
                  بانتظار المراجعة <span class="tab-count review-count">{{ countByStatus('submitted') }}</span>
                </button>
                <button class="tab-btn" [class.active]="activeTab() === 'returned'" (click)="activeTab.set('returned')">
                  مُرتجعة <span class="tab-count returned-count">{{ countByStatus('returned') }}</span>
                </button>
                <button class="tab-btn" [class.active]="activeTab() === 'completed'" (click)="activeTab.set('completed')">
                  مكتملة <span class="tab-count">{{ countByStatus('completed') }}</span>
                </button>
              </div>

              <!-- Tasks List -->
              <div class="tasks-list">
                @for (task of filtered(); track task.id) {
                  <div class="task-card" [class]="'priority-' + task.priority">
                    <div class="task-top">
                      <span class="priority-indicator" [class]="'pri-' + task.priority">
                        {{ getPriorityLabel(task.priority) }}
                      </span>
                      <span class="status-badge" [class]="'badge-' + task.status">
                        {{ getStatusLabel(task.status) }}
                      </span>
                    </div>

                    <h3 class="task-title">{{ task.title }}</h3>

                    <div class="task-meta">
                      <div class="meta-item">
                        <i class="bi bi-person-badge"></i>
                        <span>{{ store.employeeName(task.assignedTo) }}</span>
                      </div>
                      <div class="meta-item">
                        <i class="bi bi-briefcase"></i>
                        <span>{{ getCaseTitle(task.caseId) }}</span>
                      </div>
                      <div class="meta-item">
                        <i class="bi bi-calendar-event"></i>
                        <span>{{ task.dueDate | date:'d MMM yyyy':'':'ar' }}</span>
                      </div>
                    </div>

                    @if (task.status === 'returned' && task.returnReason) {
                      <div class="return-reason">
                        <i class="bi bi-exclamation-triangle"></i>
                        <span>سبب الإرجاع: {{ task.returnReason }}</span>
                      </div>
                    }

                    <!-- Branch & Merge Actions -->
                    <div class="task-actions">
                      @if (isManager()) {
                        @if (task.status === 'submitted') {
                          <button class="btn-success" (click)="reviewTask(task, 'approve')">
                            <i class="bi bi-check-lg"></i> اعتماد (Merge)
                          </button>
                          <button class="btn-warning" (click)="reviewTask(task, 'return')">
                            <i class="bi bi-arrow-return-left"></i> إرجاع
                          </button>
                        }
                        @if (task.status === 'pending') {
                          <button class="btn-primary" (click)="assignTask(task)">
                            <i class="bi bi-person-plus"></i> تعيين (Branch)
                          </button>
                        }
                      } @else {
                        @if (task.status === 'in_progress' && task.assignedTo === store.currentUser()?.id) {
                          <button class="btn-primary" (click)="submitTask(task)">
                            <i class="bi bi-send"></i> تسليم للمراجعة
                          </button>
                        }
                        @if (task.status === 'returned' && task.assignedTo === store.currentUser()?.id) {
                          <button class="btn-primary" (click)="resubmitTask(task)">
                            <i class="bi bi-arrow-repeat"></i> إعادة التسليم
                          </button>
                        }
                      }
                      <a [routerLink]="['/tasks', task.id]" class="btn-outline">
                        <i class="bi bi-eye"></i> التفاصيل
                      </a>
                    </div>
                  </div>
                } @empty {
                  <div class="empty-state">
                    <i class="bi bi-kanban"></i>
                    <p>لا توجد مهام مطابقة للبحث</p>
                  </div>
                }
              </div>
            </div>
          </div>

          <!-- Sidebar -->
          <div class="dga-sidebar">
            <div class="sidebar-card sidebar-header-card">
              <div class="sidebar-title">
                <i class="bi bi-kanban-fill"></i>
                <span>ملخص المهام</span>
              </div>
            </div>

            <div class="sidebar-card">
              <div class="stat-row">
                <span class="stat-label">إجمالي المهام</span>
                <span class="stat-value">{{ store.tasks().length }}</span>
              </div>
              <div class="stat-row">
                <span class="stat-label">مهام عاجلة</span>
                <span class="stat-value urgent">{{ store.urgentTasks() }}</span>
              </div>
              <div class="stat-row">
                <span class="stat-label">بانتظار المراجعة</span>
                <span class="stat-value review">{{ store.tasksSubmittedForReview() }}</span>
              </div>
              <div class="stat-row">
                <span class="stat-label">مُرتجعة</span>
                <span class="stat-value returned">{{ store.tasksReturned() }}</span>
              </div>
            </div>

            <!-- Workflow Guide -->
            <div class="sidebar-card">
              <div class="sidebar-section-title">
                <i class="bi bi-diagram-3"></i>
                <span>دورة المهمة (Branch & Merge)</span>
              </div>
              <div class="workflow-steps">
                <div class="wf-step">
                  <div class="wf-icon create"><i class="bi bi-plus-circle"></i></div>
                  <div class="wf-text">
                    <strong>إنشاء</strong>
                    <span>المدير ينشئ المهمة</span>
                  </div>
                </div>
                <div class="wf-arrow"><i class="bi bi-arrow-down"></i></div>
                <div class="wf-step">
                  <div class="wf-icon branch"><i class="bi bi-signpost-split"></i></div>
                  <div class="wf-text">
                    <strong>Branch (تفريع)</strong>
                    <span>تعيين لموظف</span>
                  </div>
                </div>
                <div class="wf-arrow"><i class="bi bi-arrow-down"></i></div>
                <div class="wf-step">
                  <div class="wf-icon work"><i class="bi bi-gear"></i></div>
                  <div class="wf-text">
                    <strong>تنفيذ</strong>
                    <span>الموظف يعمل</span>
                  </div>
                </div>
                <div class="wf-arrow"><i class="bi bi-arrow-down"></i></div>
                <div class="wf-step">
                  <div class="wf-icon submit"><i class="bi bi-send"></i></div>
                  <div class="wf-text">
                    <strong>تسليم</strong>
                    <span>الموظف يسلّم</span>
                  </div>
                </div>
                <div class="wf-arrow"><i class="bi bi-arrow-down"></i></div>
                <div class="wf-step">
                  <div class="wf-icon merge"><i class="bi bi-check-circle"></i></div>
                  <div class="wf-text">
                    <strong>Merge (دمج)</strong>
                    <span>المدير يعتمد أو يرجع</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </app-dashboard-layout>
  `,
  styles: [`
    .tab-filters { display:flex; gap:8px; padding:16px 24px; border-bottom:1px solid #e8e8e8; flex-wrap:wrap; }
    .tab-btn { padding:8px 16px; border-radius:20px; border:1px solid #ddd; background:#fff; cursor:pointer;
               font-size:13px; color:#555; transition:all .2s; display:flex; align-items:center; gap:6px; }
    .tab-btn.active { background:#1a7a4c; color:#fff; border-color:#1a7a4c; }
    .tab-count { background:rgba(0,0,0,.08); padding:2px 8px; border-radius:10px; font-size:11px; }
    .tab-btn.active .tab-count { background:rgba(255,255,255,.2); }
    .review-count { background:#fff3cd!important; color:#856404; }
    .returned-count { background:#f8d7da!important; color:#721c24; }

    .tasks-list { padding:16px 24px; display:flex; flex-direction:column; gap:12px; }
    .task-card { background:#fff; border:1px solid #e8e8e8; border-radius:12px; padding:20px;
                 border-right:4px solid #ddd; transition:all .2s; }
    .task-card:hover { box-shadow:0 4px 12px rgba(0,0,0,.06); }
    .task-card.priority-critical { border-right-color:#dc3545; }
    .task-card.priority-high { border-right-color:#fd7e14; }
    .task-card.priority-medium { border-right-color:#ffc107; }
    .task-card.priority-low { border-right-color:#28a745; }

    .task-top { display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; }
    .priority-indicator { font-size:11px; padding:3px 10px; border-radius:12px; font-weight:600; }
    .pri-critical { background:#fde8ea; color:#dc3545; }
    .pri-high { background:#fff3e0; color:#e65100; }
    .pri-medium { background:#fff8e1; color:#f57f17; }
    .pri-low { background:#e8f5e9; color:#2e7d32; }

    .status-badge { font-size:11px; padding:3px 10px; border-radius:12px; font-weight:500; }
    .badge-pending { background:#e3f2fd; color:#1565c0; }
    .badge-in_progress { background:#fff3e0; color:#e65100; }
    .badge-submitted { background:#fff8e1; color:#f57f17; }
    .badge-returned { background:#fde8ea; color:#c62828; }
    .badge-completed { background:#e8f5e9; color:#2e7d32; }

    .task-title { font-size:16px; font-weight:600; color:#1a1a2e; margin:0 0 12px; }
    .task-meta { display:flex; gap:20px; flex-wrap:wrap; margin-bottom:12px; }
    .meta-item { display:flex; align-items:center; gap:6px; color:#666; font-size:13px; }
    .meta-item i { color:#1a7a4c; font-size:14px; }

    .return-reason { background:#fff5f5; border:1px solid #fed7d7; border-radius:8px; padding:10px 14px;
                     margin-bottom:12px; display:flex; align-items:center; gap:8px; font-size:13px; color:#c53030; }

    .task-actions { display:flex; gap:8px; flex-wrap:wrap; padding-top:12px; border-top:1px solid #f0f0f0; }
    .btn-success { background:#28a745; color:#fff; border:none; padding:8px 16px; border-radius:8px;
                   cursor:pointer; font-size:13px; display:flex; align-items:center; gap:6px; }
    .btn-warning { background:#ffc107; color:#333; border:none; padding:8px 16px; border-radius:8px;
                   cursor:pointer; font-size:13px; display:flex; align-items:center; gap:6px; }
    .btn-primary { background:#1a7a4c; color:#fff; border:none; padding:8px 16px; border-radius:8px;
                   cursor:pointer; font-size:13px; display:flex; align-items:center; gap:6px; }
    .btn-outline { background:#fff; color:#1a7a4c; border:1px solid #1a7a4c; padding:8px 16px;
                   border-radius:8px; cursor:pointer; font-size:13px; display:flex; align-items:center;
                   gap:6px; text-decoration:none; }

    /* Sidebar Stats */
    .stat-row { display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid #f0f0f0; }
    .stat-row:last-child { border-bottom:none; }
    .stat-label { color:#666; font-size:13px; }
    .stat-value { font-weight:700; font-size:15px; color:#1a1a2e; }
    .stat-value.urgent { color:#dc3545; }
    .stat-value.review { color:#f57f17; }
    .stat-value.returned { color:#c62828; }

    /* Workflow Guide */
    .workflow-steps { padding:8px 0; }
    .wf-step { display:flex; align-items:center; gap:12px; padding:8px 0; }
    .wf-icon { width:36px; height:36px; border-radius:50%; display:flex; align-items:center;
               justify-content:center; font-size:16px; flex-shrink:0; }
    .wf-icon.create { background:#e3f2fd; color:#1565c0; }
    .wf-icon.branch { background:#f3e5f5; color:#7b1fa2; }
    .wf-icon.work { background:#fff3e0; color:#e65100; }
    .wf-icon.submit { background:#e8f5e9; color:#2e7d32; }
    .wf-icon.merge { background:#e0f2f1; color:#00695c; }
    .wf-text strong { display:block; font-size:13px; color:#1a1a2e; }
    .wf-text span { font-size:11px; color:#888; }
    .wf-arrow { text-align:center; color:#ccc; padding:2px 0 2px 18px; font-size:12px; }

    .empty-state { text-align:center; padding:60px 20px; color:#999; }
    .empty-state i { font-size:48px; display:block; margin-bottom:16px; }

    /* Responsive */
    .title-actions { display:flex; gap:12px; align-items:center; }
    @media (max-width:768px) {
      .tab-filters { gap:4px; }
      .task-meta { flex-direction:column; gap:8px; }
    }
  `]
})
export class TasksComponent {
  store = inject(StoreService);
  search = signal('');
  activeTab = signal<string>('all');
  showCreateModal = false;

  isManager = computed(() => {
    const role = this.store.currentUser()?.role;
    return role === 'admin' || role === 'senior_lawyer';
  });

  filtered = computed(() => {
    let tasks = this.store.tasks();
    const tab = this.activeTab();
    const q = this.search().toLowerCase();

    if (tab === 'pending') tasks = tasks.filter(t => t.status === 'in_progress');
    else if (tab === 'review') tasks = tasks.filter(t => t.status === 'submitted');
    else if (tab === 'returned') tasks = tasks.filter(t => t.status === 'returned');
    else if (tab === 'completed') tasks = tasks.filter(t => t.status === 'completed');

    if (q) {
      tasks = tasks.filter(t =>
        t.title.toLowerCase().includes(q) ||
        this.store.employeeName(t.assignedTo).toLowerCase().includes(q)
      );
    }

    return tasks;
  });

  countByStatus(status: string): number {
    return this.store.tasks().filter(t => t.status === status).length;
  }

  getCaseTitle(caseId: string): string {
    return this.store.cases().find(c => c.id === caseId)?.title || '—';
  }

  getPriorityLabel(p: string): string {
    const map: Record<string, string> = { low: 'منخفضة', medium: 'متوسطة', high: 'عالية', critical: 'حرجة' };
    return map[p] || p;
  }

  getStatusLabel(s: string): string {
    const map: Record<string, string> = {
      pending: 'معلّقة', in_progress: 'قيد الإنجاز', submitted: 'بانتظار المراجعة',
      returned: 'مُرتجعة', completed: 'مكتملة', cancelled: 'ملغاة'
    };
    return map[s] || s;
  }

  reviewTask(task: Task, decision: 'approve' | 'return'): void {
    if (decision === 'approve') {
      this.store.updateTask(task.id, { status: 'completed', completedAt: new Date().toISOString() });
    } else {
      const reason = prompt('سبب الإرجاع:');
      if (reason) {
        this.store.updateTask(task.id, { status: 'returned', returnReason: reason });
      }
    }
  }

  submitTask(task: Task): void {
    this.store.updateTask(task.id, { status: 'submitted' });
  }

  resubmitTask(task: Task): void {
    this.store.updateTask(task.id, { status: 'submitted', returnReason: '' });
  }

  assignTask(task: Task): void {
    this.store.updateTask(task.id, { status: 'in_progress' });
  }
}
