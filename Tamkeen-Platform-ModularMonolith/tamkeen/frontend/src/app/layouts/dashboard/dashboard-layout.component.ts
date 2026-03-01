import { Component, signal, computed, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { StoreService } from '../../core';

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard-layout.component.html',
  styleUrl: './dashboard-layout.component.scss'
})
export class DashboardLayoutComponent {
  private store = inject(StoreService);

  sidebarCollapsed = signal(false);
  sidebarMobileOpen = signal(false);
  darkMode = signal(false);
  showNotifications = signal(false);
  showUserMenu = signal(false);
  financeOpen = signal(true);

  alertCount = computed(() => this.store.activeAlerts().length);
  newLeadCount = computed(() => this.store.leads().filter(l => l.status === 'intake').length);

  topNavItems = computed(() => [
    { icon: 'bi-grid-1x2-fill', label: 'لوحة التحكم', route: '/home' },
  ]);

  caseManagementOpen = signal(true);
  caseManagementItems = computed(() => [
    { icon: 'bi-briefcase-fill', label: 'القضايا', route: '/cases' },
    { icon: 'bi-people-fill', label: 'الفرص', route: '/leads', badge: this.newLeadCount() || undefined },
    { icon: 'bi-person-vcard-fill', label: 'العملاء', route: '/clients' },
    { icon: 'bi-calendar3', label: 'التقويم والجلسات', route: '/calendar' },
  ]);

  financeItems = [
    { icon: 'bi-receipt', label: 'الفواتير', route: '/finance/invoices' },
    { icon: 'bi-cash-stack', label: 'المصروفات', route: '/finance/expenses' },
    { icon: 'bi-bank', label: 'مسير الرواتب', route: '/finance/payroll' },
    { icon: 'bi-graph-up', label: 'التقارير المالية', route: '/finance/reports' },
  ];

  managementOpen = signal(true);
  managementItems = [
    { icon: 'bi-person-badge-fill', label: 'الموظفين', route: '/employees' },
    { icon: 'bi-folder-fill', label: 'المستندات', route: '/documents' },
    { icon: 'bi-gear-fill', label: 'الإعدادات', route: '/settings' },
  ];

  toggleCaseManagement() { this.caseManagementOpen.update(v => !v); }
  toggleManagement() { this.managementOpen.update(v => !v); }

  currentUser = this.store.currentUser;
  recentAlerts = computed(() => this.store.activeAlerts().slice(0, 5));

  toggleSidebar() { this.sidebarCollapsed.update(v => !v); }
  toggleMobileSidebar() { this.sidebarMobileOpen.update(v => !v); }
  toggleFinance() { this.financeOpen.update(v => !v); }
  closeMobileOnNavigate() { this.sidebarMobileOpen.set(false); }

  toggleNotifications() { this.showNotifications.update(v => !v); }
  toggleUserMenu() { this.showUserMenu.update(v => !v); }

  toggleDarkMode() {
    this.darkMode.update(v => !v);
    document.documentElement.setAttribute('data-theme', this.darkMode() ? 'dark' : '');
  }

  getAlertIcon(type: string): string {
    return ({ appeal_deadline:'bi-exclamation-triangle-fill', agency_expiry:'bi-clock-fill', invoice_overdue:'bi-receipt-cutoff', task_overdue:'bi-list-task', session_reminder:'bi-calendar-event-fill', payroll_due:'bi-cash-stack' } as any)[type] || 'bi-bell-fill';
  }

  getAlertColor(severity: string): string {
    return ({ critical:'danger', high:'warning', medium:'info', low:'neutral' } as any)[severity] || 'neutral';
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const t = event.target as HTMLElement;
    if (!t.closest('.tmk-notifications') && !t.closest('.tmk-user-menu')) {
      this.showNotifications.set(false);
      this.showUserMenu.set(false);
    }
  }
}
