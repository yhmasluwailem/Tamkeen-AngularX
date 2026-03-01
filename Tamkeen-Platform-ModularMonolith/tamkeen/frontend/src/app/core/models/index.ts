
// تمكين — Core Domain Models
export type UserRole = 'admin' | 'senior_lawyer' | 'lawyer' | 'paralegal' | 'secretary';
export interface User { id: string; username: string; name_ar: string; name_en?: string; role: UserRole; phone: string; email: string; title: string; avatar_initials?: string; is_active: boolean; }

export type StageKey = 'registration' | 'pleading' | 'filing' | 'hearings' | 'judgment' | 'appeal' | 'execution' | 'closure';
export type StageStatus = 'locked' | 'active' | 'completed' | 'skipped';
export interface GateConditionInstance { id: string; condition_type: string; label: string; is_required: boolean; is_met: boolean; met_at?: string; }
export interface StageInstance { id: string; stage_key: StageKey; name_ar: string; order: number; status: StageStatus; owner_id?: string; entered_at?: string; completed_at?: string; expected_duration_days: number; icon: string; color: string; gate_conditions: GateConditionInstance[]; }
export interface CaseWorkflow { id: string; case_id: string; current_stage_key: StageKey; progress_percentage: number; stages: StageInstance[]; }

export type ClientType = 'individual' | 'corporate';
export type IdType = 'national_id' | 'iqama' | 'commercial_reg' | 'passport' | 'government_id';
export interface Client { id: string; name: string; name_en?: string; client_type: ClientType; id_type: IdType; id_number: string; phone: string; email?: string; address?: string; city?: string; region?: string; notes?: string; whatsapp_opt_in: boolean; tags?: string[]; rating?: number; created_at: string; updated_at: string; }

export type CourtType = 'personal_status' | 'execution' | 'criminal' | 'general' | 'commercial' | 'labor';
export type CaseStatus = 'active' | 'pending' | 'closed' | 'archived' | 'appealed' | 'suspended' | 'settled';
export type PartyRole = 'plaintiff' | 'defendant';
export interface Case { id: string; title: string; description?: string; client_id: string; client?: Client; assigned_to?: string; assigned_to_user?: User; team_members?: string[]; status: CaseStatus; court_type: CourtType; case_category: string; case_sub_category: string; court_branch?: string; circle_number?: string; najiz_number?: string; party_role: PartyRole; opponents: string[]; filing_date: string; agency_expiry?: string; agreed_fee?: number; paid_amount: number; tags?: string[]; workflow?: CaseWorkflow; created_at: string; updated_at: string; }

export type TaskStatus = 'pending' | 'in_progress' | 'submitted' | 'under_review' | 'returned' | 'approved' | 'completed' | 'cancelled' | 'overdue';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type TaskContextType = 'case' | 'lead' | 'financial';
export interface Task { id: string; title: string; description?: string; context_type: TaskContextType; case_id?: string; lead_id?: string; is_auto_generated: boolean; is_gate_condition: boolean; assigned_to?: string; assigned_to_name?: string; assigned_by?: string; assigned_by_name?: string; status: TaskStatus; priority: TaskPriority; due_date?: string; started_at?: string; submitted_at?: string; completed_at?: string; work_notes?: string; completion_percentage: number; review_notes?: string; reviewed_by_name?: string; return_count: number; context_entity_title?: string; is_overdue: boolean; revisions?: TaskRevision[]; created_at: string; updated_at: string; }
export interface TaskRevision { id: string; revision_number: number; revision_type: 'submitted' | 'returned' | 'approved'; author_name: string; notes: string; created_at: string; }

export type LeadStatus = 'intake' | 'consultation' | 'case_study' | 'fee_proposal' | 'engagement' | 'converted' | 'declined' | 'withdrawn';
export interface Lead {
  id: string; name: string; phone: string; email?: string; status: LeadStatus; source: string;
  legal_issue_type?: string; issue_description?: string; assigned_to?: string;
  created_at: string; updated_at?: string;
  // camelCase aliases & extended fields
  type?: 'individual' | 'corporate';
  legalIssueType?: string;
  urgencyLevel?: string;
  issueDescription?: string;
  assignedTo?: string;
  idNumber?: string;
  consultationDate?: string;
  consultationFee?: number;
  consultationPaid?: boolean;
  consultationNotes?: string;
  initialAssessment?: string;
  communications?: any[];
  conflictCheck?: boolean;
  conflictNotes?: string;
  caseMerit?: string;
  meritNotes?: string;
  complexityLevel?: string;
  proposedAmount?: number;
  proposalItems?: any[];
  paymentPlan?: string;
  contractSigned?: boolean;
  contractDate?: string;
  poaNumber?: string;
  poaExpiry?: string;
  initialPaymentReceived?: boolean;
  initialPaymentAmount?: number;
  [key: string]: any;
}

export type SessionStatus = 'scheduled' | 'completed' | 'cancelled' | 'postponed';
export interface Session { id: string; case_id: string; title: string; date: string; time: string; session_type: string; status: SessionStatus; notes?: string; outcome?: string; created_at: string; }

export interface Comment { id: string; content: string; author_id: string; author_name?: string; context_type: 'case' | 'lead' | 'task' | 'financial'; entity_id: string; parent_id?: string; replies?: Comment[]; mentions?: string[]; created_at: string; }

export type DocumentCategory = 'contracts' | 'pleadings' | 'judgments' | 'agencies' | 'identities' | 'evidence' | 'invoices' | 'receipts' | 'other';
export interface Document { id: string; title: string; category: DocumentCategory; status: string; file_name: string; file_size: number; case_id?: string; client_id?: string; created_at: string; }

export type InvoiceStatus = 'draft' | 'issued' | 'paid' | 'partially_paid' | 'overdue' | 'cancelled';
export interface Invoice { id: string; invoice_number: string; client_id: string; case_id?: string; total: number; status: InvoiceStatus; paid_amount: number; issue_date: string; due_date: string; }
export interface Expense { id: string; title: string; category: string; amount: number; date: string; status: string; }
export interface Employee extends User { name?: string; joinDate?: string; department?: string; join_date: string; base_salary: number; permissions: string[]; }

export interface Alert { id: string; title: string; description: string; severity: 'low' | 'medium' | 'high' | 'critical'; alert_type: string; days_remaining: number; entity_type: string; entity_id: string; link: string; dismissed: boolean; }
export interface DashboardStats { totalClients: number; activeCases: number; newLeads: number; pendingInvoices: number; urgentTasks: number; upcomingSessions: number; totalRevenue: number; pendingPayments: number; monthlyRevenue: number; monthlyExpenses: number; netIncome: number; tasksSubmittedForReview: number; tasksReturned: number; tasksApproved: number; }
