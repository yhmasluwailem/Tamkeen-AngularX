
export const MOCK_EMPLOYEES = [
  { id: 'emp-1', name: 'أ. محمد الأحمدي', role: 'admin', title: 'مدير المكتب', phone: '0501234567', email: 'm@tamkeen.sa' },
  { id: 'emp-2', name: 'أ. خالد العتيبي', role: 'senior_lawyer', title: 'محامي أول', phone: '0501234568', email: 'k@tamkeen.sa' },
  { id: 'emp-3', name: 'أ. فهد القحطاني', role: 'lawyer', title: 'محامي', phone: '0501234569', email: 'f@tamkeen.sa' },
  { id: 'emp-4', name: 'أ. سارة المالكي', role: 'paralegal', title: 'مساعدة قانونية', phone: '0501234570', email: 's@tamkeen.sa' },
  { id: 'emp-5', name: 'نورة الحربي', role: 'secretary', title: 'سكرتيرة', phone: '0501234571', email: 'n@tamkeen.sa' },
];

export const MOCK_CLIENTS = [
  { id: 'cli-1', name: 'عبدالله بن سعد الغامدي', type: 'individual', idType: 'national_id', idNumber: '1088234567', phone: '0551234567', email: 'abdullah@email.com', whatsappOptIn: true, createdAt: '2024-01-15', updatedAt: '2024-12-01' },
  { id: 'cli-2', name: 'شركة الأفق التجارية', type: 'corporate', idType: 'commercial_reg', idNumber: '4030123456', phone: '0112345678', email: 'info@alofuq.com', whatsappOptIn: false, createdAt: '2024-03-20', updatedAt: '2024-11-15' },
  { id: 'cli-3', name: 'فاطمة بنت أحمد الزهراني', type: 'individual', idType: 'national_id', idNumber: '1055678901', phone: '0559876543', email: 'fatima@email.com', whatsappOptIn: true, createdAt: '2024-06-10', updatedAt: '2024-12-20' },
];

export const MOCK_CASES = [
  { id: 'case-1', title: 'مطالبة تجارية — شركة الأفق ضد مؤسسة النور', clientId: 'cli-2', status: 'active', courtType: 'commercial', caseCategory: 'contract_dispute', caseSubCategory: '', partyRole: 'plaintiff', opponents: ['مؤسسة النور'], filingDate: '2024-10-15', assignedTo: 'emp-3', agreedFee: 50000, paidAmount: 25000, createdAt: '2024-10-10', updatedAt: '2024-12-25' },
  { id: 'case-2', title: 'قضية حضانة — عبدالله الغامدي', clientId: 'cli-1', status: 'active', courtType: 'personal_status', caseCategory: 'custody', caseSubCategory: '', partyRole: 'plaintiff', opponents: ['هند المطيري'], filingDate: '2024-11-01', assignedTo: 'emp-2', agreedFee: 30000, paidAmount: 15000, createdAt: '2024-10-28', updatedAt: '2024-12-20' },
  { id: 'case-3', title: 'مستحقات عمالية — فاطمة الزهراني', clientId: 'cli-3', status: 'pending', courtType: 'labor', caseCategory: 'wages', caseSubCategory: '', partyRole: 'plaintiff', opponents: ['شركة البناء المتقدمة'], filingDate: '2024-12-01', assignedTo: 'emp-3', agreedFee: 15000, paidAmount: 5000, createdAt: '2024-11-25', updatedAt: '2024-12-15' },
];

export const MOCK_TASKS = [
  { id: 'task-1', title: 'إعداد لائحة الدعوى التجارية', caseId: 'case-1', status: 'in_progress', priority: 'high', assignedTo: 'emp-4', dueDate: '2025-01-15', description: 'صياغة لائحة الدعوى مع المستندات الداعمة', createdAt: '2024-12-20', updatedAt: '2024-12-25' },
  { id: 'task-2', title: 'مراجعة عقد التسوية', caseId: 'case-1', status: 'submitted', priority: 'critical', assignedTo: 'emp-3', dueDate: '2025-01-10', description: 'مراجعة شروط التسوية المقترحة', createdAt: '2024-12-18', updatedAt: '2024-12-24' },
  { id: 'task-3', title: 'تجهيز مذكرة الجلسة', caseId: 'case-2', status: 'pending', priority: 'medium', assignedTo: 'emp-4', dueDate: '2025-01-20', description: 'إعداد مذكرة للجلسة القادمة', createdAt: '2024-12-22', updatedAt: '2024-12-22' },
  { id: 'task-4', title: 'جمع مستندات الرواتب', caseId: 'case-3', status: 'returned', priority: 'high', assignedTo: 'emp-5', dueDate: '2025-01-05', description: 'طلب كشوف الرواتب من العميلة', createdAt: '2024-12-10', updatedAt: '2024-12-23' },
  { id: 'task-5', title: 'رفع الدعوى في ناجز', caseId: 'case-1', status: 'pending', priority: 'high', assignedTo: 'emp-3', dueDate: '2025-01-18', description: 'رفع الدعوى إلكترونياً عبر بوابة ناجز', createdAt: '2024-12-25', updatedAt: '2024-12-25' },
  { id: 'task-6', title: 'تحديث بيانات الوكالة', caseId: 'case-2', status: 'completed', priority: 'low', assignedTo: 'emp-5', dueDate: '2024-12-30', description: 'تحديث بيانات الوكالة في النظام', createdAt: '2024-12-15', updatedAt: '2024-12-28' },
];

export const MOCK_SESSIONS = [
  { id: 'ses-1', caseId: 'case-1', title: 'الجلسة الأولى — المطالبة التجارية', date: '2025-01-20', time: '10:00', sessionType: 'hearing', status: 'scheduled' },
  { id: 'ses-2', caseId: 'case-2', title: 'جلسة حضانة — الغامدي', date: '2025-01-25', time: '09:00', sessionType: 'hearing', status: 'scheduled' },
  { id: 'ses-3', caseId: 'case-3', title: 'جلسة عمالية — الزهراني', date: '2025-02-01', time: '11:00', sessionType: 'hearing', status: 'scheduled' },
];

export const MOCK_LEADS = [
  { id: 'lead-1', name: 'سلطان الدوسري', phone: '0554321098', status: 'consultation', source: 'إحالة', legalIssueType: 'تجاري', assignedTo: 'emp-2', createdAt: '2024-12-20' },
  { id: 'lead-2', name: 'ريم العنزي', phone: '0557654321', status: 'intake', source: 'الموقع', legalIssueType: 'عمالي', assignedTo: null, createdAt: '2024-12-24' },
];

export const MOCK_INVOICES = [
  { id: 'inv-1', invoiceNumber: 'INV-2024-001', clientId: 'cli-2', caseId: 'case-1', total: 50000, status: 'partially_paid', paidAmount: 25000, issueDate: '2024-10-15', dueDate: '2024-11-15' },
  { id: 'inv-2', invoiceNumber: 'INV-2024-002', clientId: 'cli-1', caseId: 'case-2', total: 30000, status: 'partially_paid', paidAmount: 15000, issueDate: '2024-11-01', dueDate: '2024-12-01' },
];
