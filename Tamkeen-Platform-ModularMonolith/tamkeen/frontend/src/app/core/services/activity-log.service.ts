import { Injectable } from '@angular/core';
@Injectable({ providedIn: 'root' })
export class ActivityLogService {
  private logs: any[] = [];
  log(action: string, entity: string, entityId: string, details?: string) {
    this.logs.unshift({ id: Date.now().toString(), action, entity, entityId, details, timestamp: new Date().toISOString() });
  }
  getRecent(count = 10) { return this.logs.slice(0, count); }
}
