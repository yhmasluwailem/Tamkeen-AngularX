import { Injectable } from '@angular/core';
@Injectable({ providedIn: 'root' })
export class FinanceEngineService {
  calculateCaseFinancials(caseData: any, invoices: any[]) {
    const caseInvoices = invoices.filter((i: any) => i.caseId === caseData.id);
    const totalBilled = caseInvoices.reduce((s: number, i: any) => s + i.total, 0);
    const totalPaid = caseInvoices.reduce((s: number, i: any) => s + (i.paidAmount || 0), 0);
    return { agreedFee: caseData.agreedFee || 0, totalBilled, totalPaid, remaining: (caseData.agreedFee || 0) - totalPaid, collectionRate: totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 100) : 0 };
  }
}
