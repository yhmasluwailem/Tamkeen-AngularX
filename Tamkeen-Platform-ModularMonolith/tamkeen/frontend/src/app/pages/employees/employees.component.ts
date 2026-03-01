import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DashboardLayoutComponent } from '../../layouts/dashboard/dashboard-layout.component';
import { StoreService } from '../../core/services/store.service';
import { Employee } from '../../core/models';

interface HierarchyNode {
  employee: Employee;
  children: HierarchyNode[];
  level: number;
  approvalOrder: number;
}

@Component({
  selector: 'app-employees',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DashboardLayoutComponent],
  template: `
    <app-dashboard-layout>
      <div class="dga-page" dir="rtl">
        <nav class="dga-breadcrumb">
          <a routerLink="/home">إستعراض</a>
          <span class="sep">‹</span>
          <span>فريق العمل</span>
        </nav>

        <div class="dga-page-title">
          <h1>إدارة فريق العمل</h1>
          <a routerLink="/home" class="back-link">رجوع →</a>
        </div>

        <div class="dga-layout">
          <div class="dga-main">
            <div class="dga-content-card">
              <!-- Tabs -->
              <div class="emp-tabs">
                <button [class.active]="activeTab() === 'team'" (click)="activeTab.set('team')">
                  <i class="bi bi-people-fill"></i> فريق العمل
                </button>
                <button [class.active]="activeTab() === 'hierarchy'" (click)="activeTab.set('hierarchy')">
                  <i class="bi bi-diagram-3-fill"></i> الهيكل التنظيمي
                </button>
              </div>

              <!-- TEAM VIEW -->
              @if (activeTab() === 'team') {
                <div class="emp-grid">
                  @for (emp of store.employees(); track emp.id) {
                    <div class="emp-card" [class.selected]="selectedEmp()?.id === emp.id" (click)="selectedEmp.set(emp)">
                      <div class="emp-card-top">
                        <div class="emp-avatar" [style.background]="getRoleColor(emp.role)">{{ emp.name.charAt(0) }}</div>
                        <span class="emp-status" [class.active]="emp.isActive">{{ emp.isActive ? 'نشط' : 'غير نشط' }}</span>
                      </div>
                      <div class="emp-card-body">
                        <strong>{{ emp.name }}</strong>
                        <span class="emp-title">{{ emp.title || getRoleLabel(emp.role) }}</span>
                        <small>{{ emp.email }}</small>
                      </div>
                      <div class="emp-card-stats">
                        <div class="es"><span class="es-val">{{ getAssignedCases(emp.id) }}</span><span class="es-label">قضايا</span></div>
                        <div class="es"><span class="es-val">{{ getAssignedTasks(emp.id) }}</span><span class="es-label">مهام</span></div>
                        <div class="es"><span class="es-val">{{ getAssignedLeads(emp.id) }}</span><span class="es-label">فرص</span></div>
                      </div>
                    </div>
                  } @empty {
                    <div class="empty-state"><i class="bi bi-people"></i><p>لا يوجد موظفين</p></div>
                  }
                </div>
              }

              <!-- HIERARCHY VIEW -->
              @if (activeTab() === 'hierarchy') {
                <div class="hierarchy-container">
                  <div class="hierarchy-header">
                    <h3><i class="bi bi-diagram-3-fill"></i> مسار الاعتمادات والموافقات</h3>
                    <p>يوضح الهيكل التنظيمي تسلسل الموافقات في نظام العمل</p>
                  </div>

                  <!-- Approval Flow Visualization -->
                  <div class="approval-flow">
                    @for (level of hierarchyLevels(); track level.title) {
                      <div class="hierarchy-level">
                        <div class="level-header">
                          <div class="level-badge" [style.background]="level.color" [style.color]="level.textColor">
                            <i class="bi" [class]="level.icon"></i>
                          </div>
                          <div class="level-info">
                            <strong>{{ level.title }}</strong>
                            <small>{{ level.description }}</small>
                          </div>
                          <span class="level-order">المرحلة {{ level.order }}</span>
                        </div>

                        <div class="level-members">
                          @for (emp of level.employees; track emp.id) {
                            <div class="hierarchy-member">
                              <div class="hm-avatar" [style.background]="getRoleColor(emp.role)">{{ emp.name.charAt(0) }}</div>
                              <div class="hm-info">
                                <strong>{{ emp.name }}</strong>
                                <span>{{ emp.title || getRoleLabel(emp.role) }}</span>
                              </div>
                              <div class="hm-permissions">
                                @for (perm of getPermissionBadges(emp.role); track perm) {
                                  <span class="perm-badge">{{ perm }}</span>
                                }
                              </div>
                            </div>
                          } @empty {
                            <div class="level-empty">لا يوجد موظفين في هذا المستوى</div>
                          }
                        </div>

                        @if (!$last) {
                          <div class="flow-connector">
                            <div class="connector-line"></div>
                            <div class="connector-arrow">
                              <i class="bi bi-arrow-down-circle-fill"></i>
                              <span>يُرفع للاعتماد</span>
                            </div>
                            <div class="connector-line"></div>
                          </div>
                        }
                      </div>
                    }
                  </div>

                  <!-- Workflow Rules -->
                  <div class="workflow-rules">
                    <h4><i class="bi bi-gear-fill"></i> قواعد سير العمل</h4>
                    <div class="rules-grid">
                      <div class="rule-card">
                        <div class="rule-icon" style="background:rgba(27,131,84,0.1);color:#1B8354"><i class="bi bi-file-earmark-check"></i></div>
                        <div><strong>إنشاء القضايا</strong><p>يمكن للمحامين إنشاء القضايا ويتم اعتمادها من المحامي الأول</p></div>
                      </div>
                      <div class="rule-card">
                        <div class="rule-icon" style="background:rgba(37,99,235,0.1);color:#2563eb"><i class="bi bi-receipt"></i></div>
                        <div><strong>الفواتير</strong><p>يتم إنشاء الفواتير من المحامي ويعتمدها المدير قبل الإصدار</p></div>
                      </div>
                      <div class="rule-card">
                        <div class="rule-icon" style="background:rgba(217,119,6,0.1);color:#d97706"><i class="bi bi-cash-stack"></i></div>
                        <div><strong>المصروفات</strong><p>المصروفات أكثر من 5,000 ر.س تحتاج موافقة المدير</p></div>
                      </div>
                      <div class="rule-card">
                        <div class="rule-icon" style="background:rgba(124,58,237,0.1);color:#7c3aed"><i class="bi bi-calendar-check"></i></div>
                        <div><strong>الإجازات</strong><p>يتم تقديم الطلب وتمر بالمحامي الأول ثم المدير للاعتماد</p></div>
                      </div>
                    </div>
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- SIDEBAR -->
          <div class="dga-sidebar">
            <div class="sidebar-card sidebar-header-card">
              <div class="sidebar-title"><i class="bi bi-people-fill"></i><span>الفريق</span></div>
            </div>

            <div class="sidebar-card">
              <div class="sidebar-section-title"><i class="bi bi-bar-chart-fill"></i><span>إحصائيات</span></div>
              <div class="stat-row"><span>إجمالي الموظفين</span><strong>{{ store.employees().length }}</strong></div>
              <div class="stat-row"><span>محامين</span><strong>{{ countByRole('lawyer') + countByRole('senior_lawyer') }}</strong></div>
              <div class="stat-row"><span>إداريين</span><strong>{{ countByRole('admin') }}</strong></div>
              <div class="stat-row"><span>مساعدين</span><strong>{{ countByRole('paralegal') + countByRole('secretary') }}</strong></div>
            </div>

            <!-- Selected Employee Detail -->
            @if (selectedEmp()) {
              <div class="sidebar-card emp-detail-card">
                <div class="emp-detail-header">
                  <div class="emp-avatar-lg" [style.background]="getRoleColor(selectedEmp()!.role)">{{ selectedEmp()!.name.charAt(0) }}</div>
                  <strong>{{ selectedEmp()!.name }}</strong>
                  <span>{{ selectedEmp()!.title || getRoleLabel(selectedEmp()!.role) }}</span>
                </div>
                <div class="emp-detail-rows">
                  <div class="edr"><i class="bi bi-envelope"></i><span>{{ selectedEmp()!.email }}</span></div>
                  <div class="edr"><i class="bi bi-telephone"></i><span dir="ltr">{{ selectedEmp()!.phone }}</span></div>
                  <div class="edr"><i class="bi bi-calendar3"></i><span>انضم: {{ selectedEmp()!.joinDate }}</span></div>
                </div>
              </div>
            }

            <button class="sidebar-add-btn" (click)="showAdd.set(true)">
              <i class="bi bi-plus-circle"></i><span>إضافة موظف</span>
            </button>
          </div>
        </div>

        <!-- ADD EMPLOYEE MODAL -->
        @if (showAdd()) {
          <div class="tmk-overlay" (click)="showAdd.set(false)">
            <div class="tmk-modal wizard-modal" (click)="$event.stopPropagation()">
              <div class="modal-header"><h3><i class="bi bi-person-plus-fill"></i> موظف جديد</h3><button class="modal-close" (click)="showAdd.set(false)"><i class="bi bi-x-lg"></i></button></div>
              <div class="modal-body">
                <div class="form-group"><label>الاسم <span class="req">*</span></label><input [(ngModel)]="f.name" class="dga-input"></div>
                <div class="form-group"><label>المسمى الوظيفي</label><input [(ngModel)]="f.title" class="dga-input" placeholder="محامي متدرب، شريك..."></div>
                <div class="form-row">
                  <div class="form-group"><label>الدور</label>
                    <select [(ngModel)]="f.role" class="dga-select"><option value="lawyer">محامي</option><option value="senior_lawyer">محامي أول</option><option value="paralegal">مساعد قانوني</option><option value="secretary">سكرتير</option><option value="admin">مدير</option></select>
                  </div>
                  <div class="form-group"><label>الجوال</label><input [(ngModel)]="f.phone" class="dga-input" dir="ltr"></div>
                </div>
                <div class="form-group"><label>البريد</label><input [(ngModel)]="f.email" class="dga-input" dir="ltr"></div>
              </div>
              <div class="modal-footer"><button class="btn-outline" (click)="showAdd.set(false)">إلغاء</button><button class="btn-primary" (click)="submit()" [disabled]="!f.name"><i class="bi bi-check-lg"></i> حفظ</button></div>
            </div>
          </div>
        }
      </div>
    </app-dashboard-layout>
  `,
  styles: [`
    .dga-page { max-width: 1400px; margin: 0 auto; }
    .dga-breadcrumb { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; color: var(--text-secondary, #6b7280); margin-bottom: 0.5rem; }
    .dga-breadcrumb a { color: var(--text-secondary); text-decoration: none; }
    .dga-breadcrumb .sep { opacity: 0.5; }
    .dga-page-title { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
    .dga-page-title h1 { font-size: 1.5rem; font-weight: 800; margin: 0; }
    .back-link { color: var(--text-secondary); text-decoration: none; font-size: 0.9rem; }
    .dga-layout { display: grid; grid-template-columns: 1fr 300px; gap: 1.5rem; }
    @media (max-width: 1000px) { .dga-layout { grid-template-columns: 1fr; } }
    .dga-content-card { background: var(--card-bg, #fff); border-radius: 12px; border: 1px solid rgba(0,0,0,0.08); overflow: hidden; }

    /* Tabs */
    .emp-tabs { display: flex; border-bottom: 1px solid rgba(0,0,0,0.06); }
    .emp-tabs button { flex: 1; padding: 1rem; border: none; border-bottom: 3px solid transparent; background: transparent; font-family: inherit; font-size: 0.9rem; font-weight: 600; cursor: pointer; color: var(--text-secondary); display: flex; align-items: center; justify-content: center; gap: 0.5rem; transition: all 0.2s; }
    .emp-tabs button.active { color: var(--tmk-primary); border-bottom-color: var(--tmk-primary); background: rgba(27,131,84,0.03); }
    .emp-tabs button i { font-size: 1rem; }

    /* Team Grid */
    .emp-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; padding: 1.5rem; }
    .emp-card { background: var(--card-bg, #fff); border: 1px solid rgba(0,0,0,0.06); border-radius: 12px; padding: 1.25rem; cursor: pointer; transition: all 0.2s; }
    .emp-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.06); transform: translateY(-2px); }
    .emp-card.selected { border-color: var(--tmk-primary); box-shadow: 0 0 0 2px rgba(27,131,84,0.15); }
    .emp-card-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; }
    .emp-avatar { width: 3rem; height: 3rem; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 1.15rem; font-weight: 800; }
    .emp-status { padding: 0.15rem 0.5rem; border-radius: 4px; font-size: 0.7rem; font-weight: 600; }
    .emp-status.active { background: rgba(27,131,84,0.1); color: var(--tmk-primary); }
    .emp-card-body { margin-bottom: 0.75rem; }
    .emp-card-body strong { display: block; font-size: 1rem; }
    .emp-title { display: block; font-size: 0.8rem; color: var(--tmk-primary); font-weight: 600; }
    .emp-card-body small { font-size: 0.75rem; color: var(--text-secondary); }
    .emp-card-stats { display: flex; gap: 1rem; border-top: 1px solid rgba(0,0,0,0.06); padding-top: 0.75rem; }
    .es { text-align: center; flex: 1; }
    .es-val { font-size: 1.15rem; font-weight: 800; display: block; color: var(--tmk-primary); }
    .es-label { font-size: 0.65rem; color: var(--text-secondary); }

    /* ═══ HIERARCHY ═══ */
    .hierarchy-container { padding: 1.5rem; }
    .hierarchy-header { margin-bottom: 2rem; }
    .hierarchy-header h3 { font-size: 1.15rem; font-weight: 700; margin: 0 0 0.5rem; display: flex; align-items: center; gap: 0.5rem; }
    .hierarchy-header h3 i { color: var(--tmk-primary); }
    .hierarchy-header p { font-size: 0.85rem; color: var(--text-secondary); margin: 0; }

    .approval-flow { display: flex; flex-direction: column; gap: 0; }
    .hierarchy-level { position: relative; }
    .level-header { display: flex; align-items: center; gap: 1rem; padding: 1rem 1.25rem; background: rgba(0,0,0,0.015); border: 1px solid rgba(0,0,0,0.06); border-radius: 12px 12px 0 0; }
    .level-badge { width: 3rem; height: 3rem; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.25rem; flex-shrink: 0; }
    .level-info { flex: 1; }
    .level-info strong { display: block; font-size: 0.95rem; }
    .level-info small { font-size: 0.8rem; color: var(--text-secondary); }
    .level-order { padding: 0.25rem 0.75rem; background: rgba(27,131,84,0.08); color: var(--tmk-primary); border-radius: 6px; font-size: 0.75rem; font-weight: 700; }
    .level-members { background: var(--card-bg, #fff); border: 1px solid rgba(0,0,0,0.06); border-top: none; border-radius: 0 0 12px 12px; padding: 0.75rem; display: flex; flex-direction: column; gap: 0.5rem; }
    .hierarchy-member { display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; background: rgba(0,0,0,0.015); border-radius: 8px; transition: all 0.2s; }
    .hierarchy-member:hover { background: rgba(27,131,84,0.04); }
    .hm-avatar { width: 2.25rem; height: 2.25rem; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 0.85rem; flex-shrink: 0; }
    .hm-info { flex: 1; }
    .hm-info strong { display: block; font-size: 0.9rem; }
    .hm-info span { font-size: 0.75rem; color: var(--text-secondary); }
    .hm-permissions { display: flex; gap: 0.35rem; flex-wrap: wrap; }
    .perm-badge { padding: 0.15rem 0.5rem; border-radius: 4px; font-size: 0.65rem; font-weight: 600; background: rgba(27,131,84,0.08); color: var(--tmk-primary); }
    .level-empty { text-align: center; padding: 1rem; color: var(--text-muted); font-size: 0.85rem; }

    .flow-connector { display: flex; flex-direction: column; align-items: center; padding: 0.75rem 0; }
    .connector-line { width: 2px; height: 0.75rem; background: rgba(27,131,84,0.2); }
    .connector-arrow { display: flex; align-items: center; gap: 0.5rem; color: var(--tmk-primary); font-size: 0.8rem; font-weight: 600; }
    .connector-arrow i { font-size: 1.25rem; animation: pulse-arrow 2s infinite; }
    @keyframes pulse-arrow { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }

    .workflow-rules { margin-top: 2rem; }
    .workflow-rules h4 { font-size: 1rem; font-weight: 700; margin: 0 0 1rem; display: flex; align-items: center; gap: 0.5rem; }
    .workflow-rules h4 i { color: var(--tmk-primary); }
    .rules-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem; }
    @media (max-width: 700px) { .rules-grid { grid-template-columns: 1fr; } }
    .rule-card { display: flex; gap: 0.75rem; padding: 1rem; background: rgba(0,0,0,0.015); border: 1px solid rgba(0,0,0,0.05); border-radius: 10px; }
    .rule-icon { width: 2.5rem; height: 2.5rem; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; flex-shrink: 0; }
    .rule-card strong { display: block; font-size: 0.85rem; margin-bottom: 0.2rem; }
    .rule-card p { font-size: 0.75rem; color: var(--text-secondary); margin: 0; line-height: 1.5; }

    /* ═══ SIDEBAR ═══ */
    .dga-sidebar { display: flex; flex-direction: column; gap: 1rem; }
    .sidebar-card { background: var(--card-bg, #fff); border-radius: 12px; border: 1px solid rgba(0,0,0,0.08); padding: 1.25rem; }
    .sidebar-header-card { padding: 1.5rem; }
    .sidebar-title { display: flex; align-items: center; gap: 0.75rem; font-size: 1.15rem; font-weight: 700; }
    .sidebar-title i { color: var(--tmk-primary); font-size: 1.25rem; }
    .sidebar-section-title { display: flex; align-items: center; gap: 0.5rem; font-size: 0.9rem; font-weight: 600; margin-bottom: 0.75rem; padding-bottom: 0.75rem; border-bottom: 1px solid rgba(0,0,0,0.06); }
    .sidebar-section-title i { color: var(--tmk-primary); }
    .stat-row { display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0; font-size: 0.85rem; }
    .stat-row span { color: var(--text-secondary); }
    .stat-row strong { color: var(--tmk-primary); font-weight: 700; }

    .emp-detail-card { text-align: center; }
    .emp-detail-header { display: flex; flex-direction: column; align-items: center; gap: 0.3rem; margin-bottom: 1rem; }
    .emp-avatar-lg { width: 4rem; height: 4rem; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 1.5rem; font-weight: 800; margin-bottom: 0.25rem; }
    .emp-detail-header strong { font-size: 1.05rem; }
    .emp-detail-header span { font-size: 0.8rem; color: var(--tmk-primary); }
    .emp-detail-rows { text-align: right; }
    .edr { display: flex; align-items: center; gap: 0.5rem; padding: 0.4rem 0; font-size: 0.8rem; color: var(--text-secondary); }
    .edr i { color: var(--tmk-primary); width: 1rem; text-align: center; }

    .sidebar-add-btn { display: flex; align-items: center; justify-content: center; gap: 0.5rem; width: 100%; padding: 0.85rem; border: 2px dashed rgba(27,131,84,0.3); border-radius: 12px; background: rgba(27,131,84,0.03); color: var(--tmk-primary); font-family: inherit; font-size: 0.9rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
    .sidebar-add-btn:hover { background: rgba(27,131,84,0.08); border-color: rgba(27,131,84,0.5); }

    .empty-state { text-align: center; padding: 3rem; grid-column: 1 / -1; color: var(--text-muted); }
    .empty-state i { font-size: 3rem; display: block; margin-bottom: 0.5rem; opacity: 0.3; }

    /* ═══ MODAL ═══ */
    .tmk-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); z-index: 2000; display: flex; align-items: center; justify-content: center; }
    .tmk-modal { background: var(--card-bg, #fff); border-radius: 16px; width: 90%; max-width: 550px; max-height: 90vh; overflow-y: auto; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 1.5rem; border-bottom: 1px solid rgba(0,0,0,0.08); }
    .modal-header h3 { font-size: 1.15rem; font-weight: 700; margin: 0; display: flex; align-items: center; gap: 0.5rem; }
    .modal-header h3 i { color: var(--tmk-primary); }
    .modal-close { background: none; border: none; cursor: pointer; color: var(--text-secondary); font-size: 1rem; width: 2rem; height: 2rem; display: flex; align-items: center; justify-content: center; border-radius: 6px; }
    .modal-body { padding: 1.5rem; }
    .modal-footer { display: flex; justify-content: flex-end; gap: 0.75rem; padding: 1rem 1.5rem; border-top: 1px solid rgba(0,0,0,0.08); }
    .form-group { margin-bottom: 1rem; }
    .form-group label { display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.35rem; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .req { color: #ef4444; }
    .dga-input, .dga-select { width: 100%; padding: 0.65rem 0.85rem; border: 1px solid rgba(0,0,0,0.15); border-radius: 8px; font-family: inherit; font-size: 0.9rem; background: var(--card-bg, #fff); box-sizing: border-box; }
    .dga-input:focus, .dga-select:focus { outline: none; border-color: var(--tmk-primary); box-shadow: 0 0 0 3px rgba(27,131,84,0.1); }
    .btn-outline { padding: 0.55rem 1.25rem; border: 1px solid rgba(0,0,0,0.12); border-radius: 8px; background: transparent; color: var(--text-primary); font-family: inherit; font-size: 0.85rem; font-weight: 600; cursor: pointer; }
    .btn-primary { padding: 0.55rem 1.25rem; border: none; border-radius: 8px; background: var(--tmk-primary); color: white; font-family: inherit; font-size: 0.85rem; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 0.3rem; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

    :host-context([data-theme="dark"]) {
      .dga-content-card, .sidebar-card, .emp-card { background: var(--card-bg); border-color: var(--border-light); }
      .emp-tabs button.active { background: rgba(27,131,84,0.08); }
      .level-header, .hierarchy-member, .rule-card { background: rgba(255,255,255,0.03); border-color: var(--border-light); }
      .level-members { background: var(--card-bg); border-color: var(--border-light); }
      .dga-input, .dga-select { background: var(--card-bg); border-color: var(--border-light); color: var(--text-primary); }
    }
  `]
})
export class EmployeesComponent {
  store = inject(StoreService);
  activeTab = signal<'team' | 'hierarchy'>('team');
  selectedEmp = signal<Employee | null>(null);
  showAdd = signal(false);
  f = { name: '', role: 'lawyer', phone: '', email: '', title: '' };

  hierarchyLevels = computed(() => {
    const emps = this.store.employees();
    return [
      {
        title: 'الإدارة العليا', description: 'يملك صلاحية الاعتماد النهائي لجميع القرارات', order: 1,
        icon: 'bi-shield-fill-check', color: 'rgba(27,131,84,0.1)', textColor: '#1B8354',
        employees: emps.filter(e => e.role === 'admin')
      },
      {
        title: 'المحامين الأولين', description: 'مراجعة الأعمال واعتماد القضايا والفواتير', order: 2,
        icon: 'bi-person-badge-fill', color: 'rgba(37,99,235,0.1)', textColor: '#2563eb',
        employees: emps.filter(e => e.role === 'senior_lawyer')
      },
      {
        title: 'المحامين', description: 'إدارة القضايا والتعامل مع العملاء', order: 3,
        icon: 'bi-briefcase-fill', color: 'rgba(124,58,237,0.1)', textColor: '#7c3aed',
        employees: emps.filter(e => e.role === 'lawyer')
      },
      {
        title: 'الدعم والمساندة', description: 'المهام الإدارية والسكرتارية', order: 4,
        icon: 'bi-people-fill', color: 'rgba(217,119,6,0.1)', textColor: '#d97706',
        employees: emps.filter(e => ['paralegal', 'secretary'].includes(e.role))
      },
    ];
  });

  getRoleLabel(r: string) { return { admin: 'مدير النظام', senior_lawyer: 'محامي أول', lawyer: 'محامي', paralegal: 'مساعد قانوني', secretary: 'سكرتير' }[r] || r; }
  getRoleColor(r: string) { return { admin: '#1B8354', senior_lawyer: '#2563eb', lawyer: '#7c3aed', paralegal: '#d97706', secretary: '#6b7280' }[r] || '#6b7280'; }
  getAssignedTasks(id: string) { return this.store.getTasksByAssignee(id).length; }
  getAssignedCases(id: string) { return this.store.cases().filter(c => c.assignedTo === id || (c.teamMembers || []).includes(id)).length; }
  getAssignedLeads(id: string) { return this.store.leads().filter(l => l.assignedTo === id).length; }
  countByRole(role: string) { return this.store.employees().filter(e => e.role === role).length; }

  getPermissionBadges(role: string): string[] {
    const perms: Record<string, string[]> = {
      admin: ['اعتماد نهائي', 'إدارة الموظفين', 'التقارير المالية'],
      senior_lawyer: ['اعتماد القضايا', 'مراجعة الفواتير', 'إدارة الفريق'],
      lawyer: ['إدارة القضايا', 'إنشاء الفواتير', 'التواصل مع العملاء'],
      paralegal: ['إعداد المستندات', 'جدولة الجلسات'],
      secretary: ['إدارة المواعيد', 'الأرشفة'],
    };
    return perms[role] || [];
  }

  submit() {
    if (!this.f.name) return;
    this.store.addEmployee({
      id: this.store.generateId('EMP'), name: this.f.name, role: this.f.role as any,
      title: this.f.title || this.getRoleLabel(this.f.role), phone: this.f.phone, email: this.f.email,
      idNumber: '', joinDate: new Date().toISOString().split('T')[0], baseSalary: 0,
      isActive: true, permissions: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    } as any);
    this.showAdd.set(false);
    this.f = { name: '', role: 'lawyer', phone: '', email: '', title: '' };
  }
}