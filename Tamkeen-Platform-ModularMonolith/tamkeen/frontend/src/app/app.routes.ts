import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'home', loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent) },
  { path: 'leads', loadComponent: () => import('./pages/leads/leads.component').then(m => m.LeadsComponent) },
  { path: 'cases', loadComponent: () => import('./pages/cases/cases.component').then(m => m.CasesComponent) },
  { path: 'cases/:id', loadComponent: () => import('./pages/case-detail/case-detail.component').then(m => m.CaseDetailComponent) },
  { path: 'clients', loadComponent: () => import('./pages/clients/clients.component').then(m => m.ClientsComponent) },
  { path: 'clients/:id', loadComponent: () => import('./pages/client-detail/client-detail.component').then(m => m.ClientDetailComponent) },
  { path: 'tasks', loadComponent: () => import('./pages/tasks/tasks.component').then(m => m.TasksComponent) },
  { path: 'tasks/:id', loadComponent: () => import('./pages/task-detail/task-detail.component').then(m => m.TaskDetailComponent) },
  { path: 'calendar', loadComponent: () => import('./pages/calendar/calendar.component').then(m => m.CalendarComponent) },
  { path: 'documents', loadComponent: () => import('./pages/documents/documents.component').then(m => m.DocumentsComponent) },
  { path: 'finance', loadComponent: () => import('./pages/finance/finance.component').then(m => m.FinanceComponent) },
  { path: 'finance/:tab', loadComponent: () => import('./pages/finance/finance.component').then(m => m.FinanceComponent) },
  { path: 'employees', loadComponent: () => import('./pages/employees/employees.component').then(m => m.EmployeesComponent) },
  { path: 'settings', loadComponent: () => import('./pages/settings/settings.component').then(m => m.SettingsComponent) },
  { path: 'ai', loadComponent: () => import('./pages/ai/ai.component').then(m => m.AiComponent) },
  { path: '**', loadComponent: () => import('./pages/not-found/not-found.component').then(m => m.NotFoundComponent) }
];
