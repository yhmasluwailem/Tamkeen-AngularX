import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DashboardLayoutComponent } from '../../layouts/dashboard/dashboard-layout.component';
import { StoreService } from '../../core/services/store.service';

const ARABIC_MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
const ARABIC_DAYS = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DashboardLayoutComponent],
  template: `
    <app-dashboard-layout>
      <div class="page" dir="rtl">
        <div class="page-header">
          <div><h1>📅 التقويم والجلسات</h1><p>إدارة الجلسات والمهام والمواعيد</p></div>
          <div class="header-actions">
            <button class="tmk-btn outline" (click)="showAddSession.set(true)">📅 جلسة</button>
            <button class="tmk-btn primary" (click)="showAddTask.set(true)">📋 مهمة جديدة</button>
          </div>
        </div>

        <!-- NAV -->
        <div class="cal-nav">
          <button class="nav-btn" (click)="prevMonth()">→</button>
          <h2>{{ monthName() }} {{ year() }}</h2>
          <button class="nav-btn" (click)="nextMonth()">←</button>
          <button class="today-btn" (click)="goToday()">اليوم</button>
        </div>

        <!-- CALENDAR GRID -->
        <div class="cal-grid">
          <div class="cal-header">
            @for (day of weekDays; track day) { <div class="ch-cell">{{ day }}</div> }
          </div>
          <div class="cal-body">
            @for (cell of calendarCells(); track $index) {
              <div class="cal-cell" [class.other-month]="!cell.currentMonth" [class.today]="cell.isToday" [class.selected]="selectedDate() === cell.dateKey" (click)="selectDate(cell.dateKey)">
                <span class="cell-day">{{ cell.day }}</span>
                @if (cell.sessions.length > 0) {
                  <div class="cell-dots">
                    @for (s of cell.sessions.slice(0, 3); track s.id) {
                      <span class="cell-dot session" [title]="s.title || s.type"></span>
                    }
                  </div>
                  <span class="cell-count session-count">{{ cell.sessions.length }} جلسة</span>
                }
                @if (cell.tasks.length > 0) {
                  <span class="cell-count task-count">{{ cell.tasks.length }} مهمة</span>
                }
              </div>
            }
          </div>
        </div>

        <!-- DAY DETAIL -->
        @if (selectedDate()) {
          <div class="day-detail">
            <h3>📅 أحداث {{ selectedDateFormatted() }}</h3>

            <!-- SESSIONS FOR DAY -->
            @if (dayItems().sessions.length > 0) {
              <h4>⚖️ الجلسات ({{ dayItems().sessions.length }})</h4>
              @for (s of dayItems().sessions; track s.id) {
                <a [routerLink]="['/cases', s.caseId]" class="day-item session-item">
                  <div class="di-time">{{ s.time || '09:00' }}</div>
                  <div class="di-body">
                    <strong>{{ s.title || s.type }}</strong>
                    <small>📁 {{ getCaseTitle(s.caseId) }} — 👤 {{ getClientName(s) }}</small>
                  </div>
                  <span class="di-badge" [class]="'b-' + s.status">{{ s.status === 'scheduled' ? 'قادمة' : s.status === 'completed' ? 'مكتملة' : 'ملغاة' }}</span>
                </a>
              }
            }

            <!-- TASKS FOR DAY -->
            @if (dayItems().tasks.length > 0) {
              <h4>📋 المهام ({{ dayItems().tasks.length }})</h4>
              @for (t of dayItems().tasks; track t.id) {
                <div class="day-item task-item">
                  <div class="di-priority" [style.background]="getPriorityColor(t.priority)"></div>
                  <div class="di-body">
                    <strong>{{ t.title }}</strong>
                    @if (t.caseId) { <small>📁 {{ getCaseTitle(t.caseId) }}</small> }
                  </div>
                  <button class="complete-btn" (click)="completeTask(t.id)" [disabled]="t.status === 'completed'">{{ t.status === 'completed' ? '✓' : '○' }}</button>
                </div>
              }
            }

            @if (dayItems().sessions.length === 0 && dayItems().tasks.length === 0) {
              <div class="empty-day"><span>📅</span><p>لا توجد أحداث في هذا اليوم</p></div>
            }
          </div>
        }

        <!-- ADD SESSION DIALOG -->
        @if (showAddSession()) {
          <div class="tmk-overlay" (click)="showAddSession.set(false)">
            <div class="tmk-modal" (click)="$event.stopPropagation()">
              <div class="modal-header"><h3>📅 جلسة جديدة</h3><button (click)="showAddSession.set(false)">✕</button></div>
              <div class="modal-body">
                <div class="form-group"><label>القضية <span class="req">*</span></label>
                  <select [(ngModel)]="sesForm.caseId" class="tmk-select"><option value="">اختر القضية...</option>
                    @for (c of store.cases(); track c.id) { <option [value]="c.id">{{ c.title }} — {{ store.clientName(c.clientId) }}</option> }
                  </select>
                </div>
                <div class="form-row">
                  <div class="form-group"><label>نوع الجلسة</label>
                    <select [(ngModel)]="sesForm.type" class="tmk-select"><option value="first_hearing">أولى</option><option value="hearing">مرافعة</option><option value="pleading">ترافع</option><option value="judgment">حكم</option><option value="appeal">استئناف</option></select>
                  </div>
                  <div class="form-group"><label>العنوان</label><input [(ngModel)]="sesForm.title" class="tmk-input" placeholder="عنوان الجلسة"></div>
                </div>
                <div class="form-row">
                  <div class="form-group"><label>التاريخ <span class="req">*</span></label><input type="date" [(ngModel)]="sesForm.date" class="tmk-input"></div>
                  <div class="form-group"><label>الوقت</label><input type="time" [(ngModel)]="sesForm.time" class="tmk-input" dir="ltr"></div>
                </div>
                <div class="form-group"><label>ملاحظات</label><textarea [(ngModel)]="sesForm.notes" class="tmk-textarea" rows="2"></textarea></div>
              </div>
              <div class="modal-footer">
                <button class="tmk-btn outline" (click)="showAddSession.set(false)">إلغاء</button>
                <button class="tmk-btn primary" (click)="submitSession()" [disabled]="!sesForm.caseId || !sesForm.date">حفظ</button>
              </div>
            </div>
          </div>
        }

        <!-- ADD TASK DIALOG -->
        @if (showAddTask()) {
          <div class="tmk-overlay" (click)="showAddTask.set(false)">
            <div class="tmk-modal" (click)="$event.stopPropagation()">
              <div class="modal-header"><h3>📋 مهمة جديدة</h3><button (click)="showAddTask.set(false)">✕</button></div>
              <div class="modal-body">
                <div class="form-group"><label>عنوان المهمة <span class="req">*</span></label><input [(ngModel)]="taskForm.title" class="tmk-input"></div>
                <div class="form-row">
                  <div class="form-group"><label>الأولوية</label>
                    <select [(ngModel)]="taskForm.priority" class="tmk-select"><option value="urgent">عاجلة</option><option value="high">مرتفعة</option><option value="medium">متوسطة</option><option value="low">منخفضة</option></select>
                  </div>
                  <div class="form-group"><label>تاريخ الاستحقاق</label><input type="date" [(ngModel)]="taskForm.dueDate" class="tmk-input"></div>
                </div>
                <div class="form-group"><label>القضية المرتبطة</label>
                  <select [(ngModel)]="taskForm.caseId" class="tmk-select"><option value="">بدون ربط</option>
                    @for (c of store.cases(); track c.id) { <option [value]="c.id">{{ c.title }}</option> }
                  </select>
                </div>
                <div class="form-group"><label>المسؤول</label>
                  <select [(ngModel)]="taskForm.assignedTo" class="tmk-select"><option value="">غير محدد</option>
                    @for (e of store.employees(); track e.id) { <option [value]="e.id">{{ e.name }}</option> }
                  </select>
                </div>
                <div class="form-group"><label>ملاحظات</label><textarea [(ngModel)]="taskForm.notes" class="tmk-textarea" rows="2"></textarea></div>
              </div>
              <div class="modal-footer">
                <button class="tmk-btn outline" (click)="showAddTask.set(false)">إلغاء</button>
                <button class="tmk-btn primary" (click)="submitTask()" [disabled]="!taskForm.title">حفظ</button>
              </div>
            </div>
          </div>
        }
      </div>
    </app-dashboard-layout>
  `,
  styles: [`
    .page { max-width: 1200px; margin: 0 auto; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem; }
    .page-header h1 { font-size: 1.75rem; font-weight: 800; margin: 0; }
    .page-header p { color: var(--text-secondary); margin: 0.25rem 0 0; font-size: 0.9rem; }
    .header-actions { display: flex; gap: 0.5rem; }
    .cal-nav { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; }
    .cal-nav h2 { font-size: 1.25rem; font-weight: 700; min-width: 180px; text-align: center; }
    .nav-btn { width: 2.5rem; height: 2.5rem; border-radius: 8px; border: 1px solid rgba(0,0,0,0.1); background: var(--card-bg,#fff); cursor: pointer; font-size: 1rem; }
    .today-btn { padding: 0.4rem 1rem; border-radius: 8px; border: 1px solid rgba(59,130,246,0.3); background: rgba(59,130,246,0.05); color: #3b82f6; cursor: pointer; font-family: inherit; font-size: 0.85rem; font-weight: 600; margin-right: auto; }
    .cal-grid { background: var(--card-bg,#fff); border-radius: 14px; border: 1px solid rgba(0,0,0,0.06); overflow: hidden; margin-bottom: 2rem; }
    .cal-header { display: grid; grid-template-columns: repeat(7, 1fr); background: rgba(0,0,0,0.02); border-bottom: 1px solid rgba(0,0,0,0.06); }
    .ch-cell { padding: 0.75rem; text-align: center; font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); }
    .cal-body { display: grid; grid-template-columns: repeat(7, 1fr); }
    .cal-cell { min-height: 90px; padding: 0.5rem; border-bottom: 1px solid rgba(0,0,0,0.04); border-left: 1px solid rgba(0,0,0,0.04); cursor: pointer; transition: background 0.15s; position: relative; }
    .cal-cell:hover { background: rgba(59,130,246,0.03); }
    .cal-cell.other-month { opacity: 0.3; }
    .cal-cell.today { background: rgba(59,130,246,0.05); }
    .cal-cell.today .cell-day { color: var(--tmk-primary, #1B8354); font-weight: 800; }
    .cal-cell.selected { background: rgba(59,130,246,0.08); outline: 2px solid #3b82f6; outline-offset: -2px; border-radius: 4px; }
    .cell-day { font-size: 0.9rem; font-weight: 600; display: block; margin-bottom: 0.25rem; }
    .cell-dots { display: flex; gap: 3px; margin-bottom: 2px; }
    .cell-dot { width: 6px; height: 6px; border-radius: 50%; }
    .cell-dot.session { background: #3b82f6; }
    .cell-count { font-size: 0.65rem; display: block; border-radius: 4px; padding: 0 0.3rem; }
    .session-count { background: rgba(59,130,246,0.1); color: #3b82f6; }
    .task-count { background: rgba(245,158,11,0.1); color: #f59e0b; }

    .day-detail { background: var(--card-bg,#fff); border-radius: 14px; border: 1px solid rgba(0,0,0,0.06); padding: 1.5rem; }
    .day-detail h3 { font-size: 1.1rem; font-weight: 700; margin: 0 0 1rem; }
    .day-detail h4 { font-size: 0.9rem; font-weight: 600; margin: 1rem 0 0.5rem; color: var(--text-secondary); }
    .day-item { display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; border-radius: 8px; margin-bottom: 0.4rem; text-decoration: none; color: inherit; transition: background 0.15s; }
    .session-item { background: rgba(59,130,246,0.03); border: 1px solid rgba(59,130,246,0.1); }
    .session-item:hover { background: rgba(59,130,246,0.07); }
    .task-item { background: rgba(0,0,0,0.02); border: 1px solid rgba(0,0,0,0.04); }
    .di-time { font-size: 0.9rem; font-weight: 700; min-width: 3.5rem; color: #3b82f6; }
    .di-priority { width: 4px; height: 2rem; border-radius: 4px; flex-shrink: 0; }
    .di-body { flex: 1; }
    .di-body strong { display: block; font-size: 0.9rem; }
    .di-body small { font-size: 0.8rem; color: var(--text-secondary); }
    .di-badge { font-size: 0.75rem; padding: 0.15rem 0.5rem; border-radius: 10px; }
    .b-scheduled { background: rgba(59,130,246,0.1); color: #3b82f6; }
    .b-completed { background: rgba(16,185,129,0.1); color: #10b981; }
    .b-cancelled { background: rgba(107,114,128,0.1); color: #6b7280; }
    .complete-btn { width: 2rem; height: 2rem; border-radius: 50%; border: 2px solid #d1d5db; background: transparent; cursor: pointer; font-size: 0.8rem; color: transparent; }
    .complete-btn:hover:not(:disabled) { border-color: #10b981; color: #10b981; background: rgba(16,185,129,0.1); }
    .complete-btn:disabled { border-color: #10b981; color: #10b981; background: rgba(16,185,129,0.1); }
    .empty-day { text-align: center; padding: 2rem; color: var(--text-secondary); }
    .empty-day span { font-size: 2rem; display: block; margin-bottom: 0.5rem; opacity: 0.4; }

    .tmk-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); z-index: 2000; display: flex; align-items: center; justify-content: center; }
    .tmk-modal { background: var(--card-bg,#fff); border-radius: 16px; width: 90%; max-width: 550px; max-height: 90vh; overflow-y: auto; }
    .modal-header { display: flex; justify-content: space-between; padding: 1.25rem 1.5rem; border-bottom: 1px solid rgba(0,0,0,0.08); }
    .modal-header h3 { font-size: 1.1rem; font-weight: 700; margin: 0; }
    .modal-header button { background: none; border: none; font-size: 1.25rem; cursor: pointer; }
    .modal-body { padding: 1.5rem; }
    .modal-footer { display: flex; justify-content: flex-end; gap: 0.75rem; padding: 1rem 1.5rem; border-top: 1px solid rgba(0,0,0,0.08); }
    .form-group { margin-bottom: 1rem; }
    .form-group label { display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.35rem; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .req { color: #ef4444; }
    .tmk-input,.tmk-select,.tmk-textarea { width: 100%; padding: 0.6rem 0.8rem; border: 1px solid rgba(0,0,0,0.15); border-radius: 8px; font-family: inherit; font-size: 0.9rem; box-sizing: border-box; background: var(--card-bg,#fff); }
    .tmk-input:focus,.tmk-select:focus { outline: none; border-color: var(--tmk-primary, #1B8354); }
    .tmk-btn { padding: 0.55rem 1.25rem; border-radius: 8px; border: none; font-family: inherit; font-size: 0.85rem; font-weight: 600; cursor: pointer; }
    .tmk-btn.primary { background: var(--tmk-primary, #1B8354); color: white; }
    .tmk-btn.primary:disabled { opacity: 0.5; }
    .tmk-btn.outline { background: transparent; border: 1px solid rgba(0,0,0,0.12); }
  `]
})
export class CalendarComponent {
  store = inject(StoreService);
  weekDays = ARABIC_DAYS;

  month = signal(new Date().getMonth());
  year = signal(new Date().getFullYear());
  selectedDate = signal<string>('');
  showAddSession = signal(false);
  showAddTask = signal(false);

  sesForm = { caseId: '', type: 'hearing' as string, title: '', date: '', time: '09:00', notes: '' };
  taskForm = { title: '', priority: 'medium' as string, dueDate: '', caseId: '', assignedTo: '', notes: '' };

  monthName = computed(() => ARABIC_MONTHS[this.month()]);

  calendarCells = computed(() => {
    const y = this.year(), m = this.month();
    const firstDay = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const daysInPrev = new Date(y, m, 0).getDate();
    const today = new Date().toISOString().split('T')[0];
    const sessions = this.store.sessions();
    const tasks = this.store.tasks();
    const cells: any[] = [];

    for (let i = firstDay - 1; i >= 0; i--) {
      const day = daysInPrev - i;
      const dateKey = this.formatDate(y, m - 1, day);
      cells.push({ day, dateKey, currentMonth: false, isToday: false, sessions: sessions.filter(s => s.date === dateKey), tasks: tasks.filter(t => t.dueDate === dateKey) });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateKey = this.formatDate(y, m, d);
      cells.push({ day: d, dateKey, currentMonth: true, isToday: dateKey === today, sessions: sessions.filter(s => s.date === dateKey), tasks: tasks.filter(t => t.dueDate === dateKey) });
    }
    const remaining = 42 - cells.length;
    for (let d = 1; d <= remaining; d++) {
      const dateKey = this.formatDate(y, m + 1, d);
      cells.push({ day: d, dateKey, currentMonth: false, isToday: false, sessions: sessions.filter(s => s.date === dateKey), tasks: tasks.filter(t => t.dueDate === dateKey) });
    }
    return cells;
  });

  dayItems = computed(() => {
    const dk = this.selectedDate();
    return {
      sessions: this.store.sessions().filter(s => s.date === dk),
      tasks: this.store.tasks().filter(t => t.dueDate === dk),
    };
  });

  selectedDateFormatted = computed(() => {
    if (!this.selectedDate()) return '';
    return new Date(this.selectedDate()).toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  });

  prevMonth() { if (this.month() === 0) { this.month.set(11); this.year.update(y => y - 1); } else this.month.update(m => m - 1); }
  nextMonth() { if (this.month() === 11) { this.month.set(0); this.year.update(y => y + 1); } else this.month.update(m => m + 1); }
  goToday() { const now = new Date(); this.month.set(now.getMonth()); this.year.set(now.getFullYear()); this.selectedDate.set(now.toISOString().split('T')[0]); }
  selectDate(dk: string) { this.selectedDate.set(dk); }

  formatDate(y: number, m: number, d: number) {
    const date = new Date(y, m, d);
    return date.toISOString().split('T')[0];
  }

  getCaseTitle(id: string) { return this.store.getCase(id)?.title || '—'; }
  getClientName(session: any) { const c = this.store.getCase(session.caseId); return c ? this.store.clientName(c.clientId) : '—'; }
  getPriorityColor(p: string) { return { urgent: '#ef4444', high: '#f59e0b', medium: '#3b82f6', low: '#6b7280' }[p] || '#6b7280'; }
  completeTask(id: string) { this.store.updateTask(id, { status: 'completed' as any }); }

  submitSession() {
    if (!this.sesForm.caseId || !this.sesForm.date) return;
    const caseData = this.store.getCase(this.sesForm.caseId);
    this.store.addSession({
      id: this.store.generateId('SES'), caseId: this.sesForm.caseId, clientId: caseData?.clientId || '',
      type: this.sesForm.type as any, title: this.sesForm.title || 'جلسة', date: this.sesForm.date,
      time: this.sesForm.time, status: 'scheduled', notes: this.sesForm.notes,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    } as any);
    this.showAddSession.set(false);
    this.sesForm = { caseId: '', type: 'hearing', title: '', date: '', time: '09:00', notes: '' };
  }

  submitTask() {
    if (!this.taskForm.title) return;
    this.store.addTask({
      id: this.store.generateId('TASK'), title: this.taskForm.title, priority: this.taskForm.priority as any,
      status: 'pending', dueDate: this.taskForm.dueDate || new Date().toISOString().split('T')[0],
      caseId: this.taskForm.caseId || undefined, assignedTo: this.taskForm.assignedTo || undefined,
      notes: this.taskForm.notes, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    } as any);
    this.showAddTask.set(false);
    this.taskForm = { title: '', priority: 'medium', dueDate: '', caseId: '', assignedTo: '', notes: '' };
  }
}
