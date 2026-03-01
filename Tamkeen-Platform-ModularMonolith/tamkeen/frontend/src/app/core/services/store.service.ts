import { Injectable, signal, computed } from '@angular/core';
import { MOCK_EMPLOYEES, MOCK_CLIENTS, MOCK_CASES, MOCK_TASKS, MOCK_SESSIONS, MOCK_LEADS, MOCK_INVOICES } from '../data/mock-data';

@Injectable({ providedIn: 'root' })
export class StoreService {
  private _currentUser = signal<any>(MOCK_EMPLOYEES[0]); // Admin by default
  private _employees = signal<any[]>(MOCK_EMPLOYEES);
  private _clients = signal<any[]>(MOCK_CLIENTS);
  private _cases = signal<any[]>(MOCK_CASES);
  private _tasks = signal<any[]>(MOCK_TASKS);
  private _sessions = signal<any[]>(MOCK_SESSIONS);
  private _leads = signal<any[]>(MOCK_LEADS);
  private _invoices = signal<any[]>(MOCK_INVOICES);

  currentUser = this._currentUser.asReadonly();
  employees = this._employees.asReadonly();
  clients = this._clients.asReadonly();
  cases = this._cases.asReadonly();
  tasks = this._tasks.asReadonly();
  sessions = this._sessions.asReadonly();
  leads = this._leads.asReadonly();
  invoices = this._invoices.asReadonly();

  stats = computed(() => ({
    totalClients: this._clients().length,
    activeCases: this._cases().filter(c => c.status === 'active').length,
    newLeads: this._leads().filter(l => l.status === 'intake').length,
    pendingInvoices: this._invoices().filter(i => !['paid','cancelled'].includes(i.status)).length,
    urgentTasks: this._tasks().filter(t => t.priority === 'critical' || t.priority === 'high').length,
    upcomingSessions: this._sessions().filter(s => s.status === 'scheduled').length,
    totalRevenue: this._invoices().reduce((s, i) => s + (i.paidAmount || 0), 0),
    pendingPayments: this._invoices().reduce((s, i) => s + (i.total - (i.paidAmount || 0)), 0),
    tasksSubmittedForReview: this._tasks().filter(t => t.status === 'submitted').length,
    tasksReturned: this._tasks().filter(t => t.status === 'returned').length,
  }));

  // Mutations
  addClient(c: any) { this._clients.update(list => [...list, c]); }
  addCase(c: any) { this._cases.update(list => [...list, c]); }
  addTask(t: any) { this._tasks.update(list => [...list, t]); }
  updateTask(id: string, updates: any) { this._tasks.update(list => list.map(t => t.id === id ? { ...t, ...updates } : t)); }
  getCase(id: string) { return this._cases().find(c => c.id === id); }
  getClient(id: string) { return this._clients().find(c => c.id === id); }
  employeeName(id: string) { return this._employees().find(e => e.id === id)?.name ?? '—'; }
  clientName(id: string) { return this._clients().find(c => c.id === id)?.name ?? '—'; }
  generateId(prefix: string) { return `${prefix}-${Date.now().toString(36)}`; }
  switchUser(id: string) { const u = this._employees().find(e => e.id === id); if (u) this._currentUser.set(u); }
}
