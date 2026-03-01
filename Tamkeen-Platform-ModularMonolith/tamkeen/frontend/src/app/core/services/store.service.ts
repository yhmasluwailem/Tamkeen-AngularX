import { Injectable, signal, computed } from '@angular/core';
import { MOCK_EMPLOYEES, MOCK_CLIENTS, MOCK_CASES, MOCK_TASKS, MOCK_SESSIONS, MOCK_LEADS, MOCK_INVOICES } from '../data/mock-data';

@Injectable({ providedIn: 'root' })
export class StoreService {
  private _currentUser = signal<any>(MOCK_EMPLOYEES[0]);
  private _employees = signal<any[]>(MOCK_EMPLOYEES);
  private _clients = signal<any[]>(MOCK_CLIENTS);
  private _cases = signal<any[]>(MOCK_CASES);
  private _tasks = signal<any[]>(MOCK_TASKS);
  private _sessions = signal<any[]>(MOCK_SESSIONS);
  private _leads = signal<any[]>(MOCK_LEADS);
  private _invoices = signal<any[]>(MOCK_INVOICES);
  private _documents = signal<any[]>([]);
  private _expenses = signal<any[]>([]);
  private _alerts = signal<any[]>([]);

  currentUser = this._currentUser.asReadonly();
  employees = this._employees.asReadonly();
  clients = this._clients.asReadonly();
  cases = this._cases.asReadonly();
  tasks = this._tasks.asReadonly();
  sessions = this._sessions.asReadonly();
  leads = this._leads.asReadonly();
  invoices = this._invoices.asReadonly();
  documents = this._documents.asReadonly();
  expenses = this._expenses.asReadonly();
  alerts = this._alerts.asReadonly();

  activeAlerts = computed(() => this._alerts().filter((a: any) => !a.dismissed));

  urgentTasks = computed(() => this._tasks().filter((t: any) => t.priority === 'critical' || t.priority === 'high').length);
  tasksSubmittedForReview = computed(() => this._tasks().filter((t: any) => t.status === 'submitted').length);
  tasksReturned = computed(() => this._tasks().filter((t: any) => t.status === 'returned').length);

  stats = computed(() => ({
    totalClients: this._clients().length,
    activeCases: this._cases().filter((c: any) => c.status === 'active').length,
    newLeads: this._leads().filter((l: any) => l.status === 'intake').length,
    pendingInvoices: this._invoices().filter((i: any) => !['paid','cancelled'].includes(i.status)).length,
    urgentTasks: this._tasks().filter((t: any) => t.priority === 'critical' || t.priority === 'high').length,
    upcomingSessions: this._sessions().filter((s: any) => s.status === 'scheduled').length,
    totalRevenue: this._invoices().reduce((s: number, i: any) => s + (i.paidAmount || 0), 0),
    pendingPayments: this._invoices().reduce((s: number, i: any) => s + (i.total - (i.paidAmount || 0)), 0),
    tasksSubmittedForReview: this._tasks().filter((t: any) => t.status === 'submitted').length,
    tasksReturned: this._tasks().filter((t: any) => t.status === 'returned').length,
  }));

  dashboardStats = computed(() => ({
    totalClients: this._clients().length,
    activeCases: this._cases().filter((c: any) => c.status === 'active').length,
    newLeads: this._leads().filter((l: any) => l.status === 'intake').length,
    pendingInvoices: this._invoices().filter((i: any) => !['paid','cancelled'].includes(i.status)).length,
    urgentTasks: this._tasks().filter((t: any) => t.priority === 'critical' || t.priority === 'high').length,
    upcomingSessions: this._sessions().filter((s: any) => s.status === 'scheduled').length,
    totalRevenue: this._invoices().reduce((s: number, i: any) => s + (i.paidAmount || 0), 0),
    pendingPayments: this._invoices().reduce((s: number, i: any) => s + (i.total - (i.paidAmount || 0)), 0),
    monthlyRevenue: 0,
    monthlyExpenses: this._expenses().reduce((s: number, e: any) => s + (e.amount || 0), 0),
    netIncome: 0,
    tasksSubmittedForReview: this._tasks().filter((t: any) => t.status === 'submitted').length,
    tasksReturned: this._tasks().filter((t: any) => t.status === 'returned').length,
    tasksApproved: this._tasks().filter((t: any) => t.status === 'approved').length,
  }));

  // Mutations
  addClient(c: any) { this._clients.update(list => [...list, c]); }
  addCase(c: any) { this._cases.update(list => [...list, c]); }
  addTask(t: any) { this._tasks.update(list => [...list, t]); }
  addSession(s: any) { this._sessions.update(list => [...list, s]); }
  addDocument(d: any) { this._documents.update(list => [...list, d]); }
  addInvoice(i: any) { this._invoices.update(list => [...list, i]); }
  addExpense(e: any) { this._expenses.update(list => [...list, e]); }
  addLead(l: any) { this._leads.update(list => [...list, l]); }
  addEmployee(e: any) { this._employees.update(list => [...list, e]); }

  updateTask(id: string, updates: any) { this._tasks.update(list => list.map((t: any) => t.id === id ? { ...t, ...updates } : t)); }
  updateCase(id: string, updates: any) { this._cases.update(list => list.map((c: any) => c.id === id ? { ...c, ...updates } : c)); }
  updateLead(id: string, updates: any) { this._leads.update(list => list.map((l: any) => l.id === id ? { ...l, ...updates } : l)); }
  updateInvoice(id: string, updates: any) { this._invoices.update(list => list.map((i: any) => i.id === id ? { ...i, ...updates } : i)); }
  deleteDocument(id: string) { this._documents.update(list => list.filter((d: any) => d.id !== id)); }

  // Getters
  getCase(id: string) { return this._cases().find((c: any) => c.id === id); }
  getClient(id: string) { return this._clients().find((c: any) => c.id === id); }
  getEmployee(id: string) { return this._employees().find((e: any) => e.id === id); }
  getLead(id: string) { return this._leads().find((l: any) => l.id === id); }

  getCaseSessions(caseId: string) { return this._sessions().filter((s: any) => s.caseId === caseId || s.case_id === caseId); }
  getCaseDocuments(caseId: string) { return this._documents().filter((d: any) => d.caseId === caseId || d.case_id === caseId); }
  getCaseInvoices(caseId: string) { return this._invoices().filter((i: any) => i.caseId === caseId || i.case_id === caseId); }
  getClientCases(clientId: string) { return this._cases().filter((c: any) => c.clientId === clientId || c.client_id === clientId); }
  getClientInvoices(clientId: string) { return this._invoices().filter((i: any) => i.clientId === clientId || i.client_id === clientId); }
  getTasksByAssignee(empId: string) { return this._tasks().filter((t: any) => t.assignedTo === empId || t.assigned_to === empId); }

  getUpcomingSessions(days: number) {
    const now = new Date();
    const limit = new Date(now.getTime() + days * 86400000);
    return this._sessions().filter((s: any) => { const d = new Date(s.date); return d >= now && d <= limit; });
  }

  convertLead(leadId: string, client: any, caseData: any) {
    this.addClient(client);
    this.addCase(caseData);
    this.updateLead(leadId, { status: 'converted' });
  }

  employeeName(id: string) { return this._employees().find((e: any) => e.id === id)?.name ?? '—'; }
  clientName(id: string) { return this._clients().find((c: any) => c.id === id)?.name ?? '—'; }
  generateId(prefix: string) { return `${prefix}-${Date.now().toString(36)}`; }
  switchUser(id: string) { const u = this._employees().find((e: any) => e.id === id); if (u) this._currentUser.set(u); }
}
