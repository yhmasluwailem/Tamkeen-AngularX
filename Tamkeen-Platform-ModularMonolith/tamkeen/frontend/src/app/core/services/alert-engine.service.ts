import { Injectable } from '@angular/core';
import { Alert } from '../models';
@Injectable({ providedIn: 'root' })
export class AlertEngineService {
  generateAlerts(cases: any[], tasks: any[], sessions: any[]): Alert[] {
    const alerts: Alert[] = [];
    // Overdue tasks
    tasks.filter((t: any) => t.dueDate && new Date(t.dueDate) < new Date() && !['completed','cancelled'].includes(t.status))
      .forEach((t: any) => alerts.push({ id: `alert-task-${t.id}`, title: `مهمة متأخرة: ${t.title}`, description: `تاريخ الاستحقاق: ${t.dueDate}`, severity: 'high', alert_type: 'overdue_task', days_remaining: Math.ceil((new Date(t.dueDate).getTime() - Date.now()) / 86400000), entity_type: 'task', entity_id: t.id, link: `/tasks/${t.id}`, dismissed: false }));
    return alerts;
  }
}
