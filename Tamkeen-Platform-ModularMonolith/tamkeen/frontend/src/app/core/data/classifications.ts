
export const CASE_CATEGORIES: Record<string, { id: string; name: string; subtypes?: { id: string; name: string }[] }[]> = {
  personal_status: [
    { id: 'divorce', name: 'طلاق' }, { id: 'custody', name: 'حضانة' },
    { id: 'nafaqa', name: 'نفقة' }, { id: 'inheritance', name: 'إرث' },
  ],
  commercial: [
    { id: 'contract_dispute', name: 'نزاع تعاقدي' }, { id: 'partnership', name: 'شراكة' },
    { id: 'bankruptcy', name: 'إفلاس' }, { id: 'ip', name: 'ملكية فكرية' },
  ],
  labor: [
    { id: 'termination', name: 'فصل تعسفي' }, { id: 'wages', name: 'مستحقات مالية' },
    { id: 'work_injury', name: 'إصابة عمل' },
  ],
  criminal: [
    { id: 'fraud', name: 'احتيال' }, { id: 'forgery', name: 'تزوير' },
    { id: 'assault', name: 'اعتداء' },
  ],
  general: [
    { id: 'property', name: 'عقار' }, { id: 'debt', name: 'مطالبة مالية' },
  ],
  execution: [
    { id: 'judgment_execution', name: 'تنفيذ حكم' }, { id: 'commercial_paper', name: 'ورقة تجارية' },
  ],
};

export const SAUDI_COURTS = [
  { id: 'personal_status', name: 'محكمة الأحوال الشخصية', categories: CASE_CATEGORIES['personal_status'] },
  { id: 'execution', name: 'محكمة التنفيذ', categories: CASE_CATEGORIES['execution'] },
  { id: 'criminal', name: 'المحكمة الجزائية', categories: CASE_CATEGORIES['criminal'] },
  { id: 'general', name: 'المحكمة العامة', categories: CASE_CATEGORIES['general'] },
  { id: 'commercial', name: 'المحكمة التجارية', categories: CASE_CATEGORIES['commercial'] },
  { id: 'labor', name: 'المحكمة العمالية', categories: CASE_CATEGORIES['labor'] },
];

export const SAUDI_REGIONS = [
  'الرياض', 'مكة المكرمة', 'المدينة المنورة', 'القصيم', 'المنطقة الشرقية',
  'عسير', 'تبوك', 'حائل', 'الحدود الشمالية', 'جازان', 'نجران', 'الباحة', 'الجوف',
];
