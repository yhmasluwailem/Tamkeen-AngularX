import { Injectable } from '@angular/core';
import { CaseWorkflow, StageInstance, StageKey, GateConditionInstance } from '../models';

@Injectable({ providedIn: 'root' })
export class WorkflowEngineService {
  private readonly DEFAULT_STAGES: Omit<StageInstance, 'id' | 'gate_conditions'>[] = [
    { stage_key: 'registration', name_ar: 'تسجيل القضية', order: 1, status: 'active', expected_duration_days: 3, icon: 'bi-folder-plus', color: '#1a7a4c' },
    { stage_key: 'pleading', name_ar: 'إعداد اللائحة', order: 2, status: 'locked', expected_duration_days: 7, icon: 'bi-file-text', color: '#2563eb' },
    { stage_key: 'filing', name_ar: 'رفع الدعوى', order: 3, status: 'locked', expected_duration_days: 5, icon: 'bi-cloud-upload', color: '#7c3aed' },
    { stage_key: 'hearings', name_ar: 'الجلسات', order: 4, status: 'locked', expected_duration_days: 30, icon: 'bi-calendar-check', color: '#c2410c' },
    { stage_key: 'judgment', name_ar: 'الحكم', order: 5, status: 'locked', expected_duration_days: 14, icon: 'bi-shield-check', color: '#15803d' },
    { stage_key: 'appeal', name_ar: 'الاستئناف', order: 6, status: 'locked', expected_duration_days: 30, icon: 'bi-arrow-repeat', color: '#b45309' },
    { stage_key: 'execution', name_ar: 'التنفيذ', order: 7, status: 'locked', expected_duration_days: 30, icon: 'bi-check2-all', color: '#0891b2' },
    { stage_key: 'closure', name_ar: 'إقفال القضية', order: 8, status: 'locked', expected_duration_days: 7, icon: 'bi-archive', color: '#64748b' },
  ];

  createWorkflow(caseId: string): CaseWorkflow {
    const stages: StageInstance[] = this.DEFAULT_STAGES.map((s, i) => ({
      ...s, id: `stage-${caseId}-${i}`,
      gate_conditions: this.getGateConditions(s.stage_key, caseId),
      entered_at: s.status === 'active' ? new Date().toISOString() : undefined,
    }));
    return { id: `wf-${caseId}`, case_id: caseId, current_stage_key: 'registration', progress_percentage: 0, stages };
  }

  canAdvance(workflow: CaseWorkflow) {
    const cs = workflow.stages.find(s => s.stage_key === workflow.current_stage_key);
    if (!cs) return { canAdvance: false, unmetRequired: [] as GateConditionInstance[], unmetRecommended: [] as GateConditionInstance[] };
    const unmetRequired = cs.gate_conditions.filter(g => g.is_required && !g.is_met);
    const unmetRecommended = cs.gate_conditions.filter(g => !g.is_required && !g.is_met);
    return { canAdvance: unmetRequired.length === 0, unmetRequired, unmetRecommended };
  }

  advanceStage(workflow: CaseWorkflow): CaseWorkflow {
    const idx = workflow.stages.findIndex(s => s.stage_key === workflow.current_stage_key);
    if (idx === -1 || idx >= workflow.stages.length - 1) return workflow;
    const now = new Date().toISOString();
    const stages = workflow.stages.map((s, i) => {
      if (i === idx) return { ...s, status: 'completed' as const, completed_at: now };
      if (i === idx + 1) return { ...s, status: 'active' as const, entered_at: now };
      return s;
    });
    const completed = stages.filter(s => s.status === 'completed').length;
    return { ...workflow, current_stage_key: stages[idx + 1].stage_key, progress_percentage: Math.round((completed / stages.length) * 100), stages };
  }

  private getGateConditions(stageKey: StageKey, caseId: string): GateConditionInstance[] {
    const map: Record<string, { label: string; type: string; required: boolean }[]> = {
      registration: [{ label: 'بيانات القضية مكتملة', type: 'field_filled', required: true }, { label: 'وكالة مربوطة', type: 'document_uploaded', required: true }, { label: 'عقد أتعاب مرفق', type: 'document_uploaded', required: true }],
      pleading: [{ label: 'لائحة الدعوى جاهزة', type: 'document_uploaded', required: true }, { label: 'مراجعة داخلية', type: 'approval_obtained', required: true }, { label: 'اعتماد المحامي الأول', type: 'approval_obtained', required: true }],
      filing: [{ label: 'رقم القضية مسجّل', type: 'field_filled', required: true }, { label: 'الدائرة محددة', type: 'field_filled', required: true }],
      hearings: [{ label: 'حجز القضية للحكم', type: 'custom', required: true }],
      judgment: [{ label: 'استلام صك الحكم', type: 'document_uploaded', required: true }, { label: 'إبلاغ العميل', type: 'task_completed', required: true }],
      appeal: [{ label: 'صدور حكم الاستئناف', type: 'document_uploaded', required: true }],
      execution: [{ label: 'تمام التنفيذ', type: 'custom', required: true }],
      closure: [{ label: 'لا مبالغ معلقة', type: 'payment_received', required: true }, { label: 'تقرير ختامي', type: 'document_uploaded', required: true }],
    };
    return (map[stageKey] || []).map((c, i) => ({ id: `gc-${caseId}-${stageKey}-${i}`, condition_type: c.type, label: c.label, is_required: c.required, is_met: false }));
  }
}
