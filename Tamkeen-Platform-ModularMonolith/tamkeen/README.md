# تمكين — Tamkeen Legal Practice Management Platform

> منصة متكاملة لإدارة مكاتب المحاماة في المملكة العربية السعودية

## 📋 نظرة عامة

تمكين هي منصة شاملة لإدارة الممارسة القانونية مصممة خصيصاً للسوق السعودي، تتكامل مع أنظمة ناجز والأنظمة الحكومية الأخرى.

## 🏗️ المعمارية: Modular Monolith

```
tamkeen-platform/
├── backend/                    # Django 5.1 Backend
│   ├── config/                 # Settings, URLs, WSGI
│   ├── shared/                 # Shared mixins & utilities
│   │   └── mixins/base.py      # TimeStampedModel, SoftDeleteModel, AuditMixin
│   └── apps/
│       ├── accounts/           # User model with roles (admin, senior_lawyer, lawyer, paralegal, secretary)
│       ├── workflow/            # Stage-Gate Workflow Engine (10 models)
│       ├── cases/              # Case management
│       ├── tasks/              # Task Branch & Merge system
│       ├── clients/            # Client management (individual + corporate)
│       ├── finance/            # Invoices, expenses, transactions
│       ├── documents/          # Document management with categories
│       ├── messages_app/       # Comments & notifications
│       ├── calendar_app/       # Court sessions
│       ├── employees/          # Employee extensions
│       ├── settings_app/       # System configuration
│       └── ai_engine/          # AI-Powered Legal Analysis (Claude API)
│           ├── models.py       # AIAnalysis, AIUsageLog, AIBudget
│           ├── client.py       # Claude API wrapper with prompt caching
│           ├── router.py       # Action orchestrator (cache→budget→execute→store)
│           ├── optimizer.py    # Token cost estimation & budget control
│           ├── parser.py       # JSON response parser with validation
│           ├── templates/      # 8 pre-built prompt templates
│           ├── saudi_modules/  # Saudi legal knowledge base (6 modules)
│           └── api/            # Action-based REST endpoints (no free text)
│
└── frontend/                   # Angular 19 Frontend
    ├── src/app/
    │   ├── core/               # Models, services, data, utils
    │   │   ├── models/         # TypeScript interfaces
    │   │   ├── services/       # StoreService, WorkflowEngine, AlertEngine, FinanceEngine, ActivityLog
    │   │   ├── data/           # Saudi courts, case categories, regions, mock data
    │   │   └── utils/          # Formatters (currency, date, truncate)
    │   ├── layouts/            # DGA Dashboard Layout (header, sidebar, content)
    │   └── pages/              # 14 page components
    │       ├── home/           # Dashboard with KPIs
    │       ├── cases/          # Case listing with filters
    │       ├── case-detail/    # Case detail with workflow stages
    │       ├── tasks/          # NEW: Task management with Branch & Merge
    │       ├── task-detail/    # NEW: Task detail with revision history
    │       ├── clients/        # Client listing
    │       ├── client-detail/  # Client detail with cases & communications
    │       ├── leads/          # Lead/intake management
    │       ├── calendar/       # Court sessions calendar
    │       ├── documents/      # Document management
    │       ├── finance/        # Invoices, expenses, transactions
    │       ├── employees/      # Employee management
    │       ├── settings/       # System settings
    │       └── not-found/      # 404 page
    └── public/
        └── i18n/ar.json        # Arabic translations
```

## 🔑 المفاهيم الأساسية

### 1. محرك سير العمل الموحّد (Stage-Gate)
- مسار واحد من 8 مراحل: تسجيل → لائحة → رفع → جلسات → حكم → استئناف → تنفيذ → إقفال
- شروط بوابة لكل مرحلة (مستندات، مهام، موافقات)
- مخارج استثنائية (صلح، انسحاب، شطب، تعليق)
- سجل انتقالات كامل (Audit Trail)

### 2. نظام المهام (Branch & Merge)
- **Branch**: المدير ينشئ المهمة ويعيّنها لموظف
- **Work**: الموظف ينفذ المهمة
- **Submit**: الموظف يسلّم للمراجعة
- **Merge/Return**: المدير يعتمد (Merge) أو يرجع (Return) مع سبب
- سجل مراجعات لكل مهمة (Revision History)

### 3. الصلاحيات المبنية على الأدوار
| الدور | الصلاحيات |
|-------|----------|
| مدير النظام | كامل الصلاحيات |
| محامي أول | إدارة القضايا والمهام، المراجعة |
| محامي | تنفيذ المهام المعيّنة |
| مساعد قانوني | المهام الإدارية والمستندات |
| سكرتير | المواعيد والاتصالات |

### 4. التصميم
- نظام تصميم الحكومة الرقمية (DGA)
- ألوان ناجز (#1a7a4c أساسي)
- واجهة عربية RTL بالكامل
- Bootstrap Icons

## 🚀 التشغيل

### Backend (Django)
```bash
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

### Frontend (Angular)
```bash
cd frontend
npm install
ng serve
```

## 🔗 التكاملات المخططة
- ناجز (Najiz) — النظام القضائي
- نفاذ (Nafath) — التحقق من الهوية
- أبشر — خدمات حكومية
- SAMA — المدفوعات

## 📊 التقنيات
- **Backend**: Django 5.1, DRF, PostgreSQL
- **Frontend**: Angular 19, TypeScript, SCSS
- **AI Engine**: Claude API (Sonnet 4.5 / Haiku 4.5), Prompt Caching
- **State**: Signals-based reactive store
- **Auth**: JWT (planned)
- **Deploy**: Vercel (frontend), Docker (backend)

## 🤖 محرك التحليل الذكي (AI Engine)

### المبادئ الأساسية
1. **لا يوجد إدخال نصي حر** — المستخدمون يتفاعلون من خلال أزرار وقوائم منسدلة فقط
2. **مُعاير للنظام السعودي** — مُهيأ بالكامل للقوانين والأنظمة السعودية
3. **تحسين استهلاك التوكنات** — تخزين مؤقت ذكي لتقليل التكلفة بنسبة 90%

### الإجراءات المتاحة (8 أنواع تحليل)

| الإجراء | النموذج | الوصف |
|---------|---------|-------|
| مراجعة العقد | Sonnet | تحليل شامل للبنود والمخاطر والامتثال |
| تحليل الموقف المقابل | Sonnet | تقييم حجج الطرف الآخر ونقاط الضعف |
| تحليل خطاب المطالبة | Sonnet | تحليل خطابات المطالبة ووضع استراتيجية الرد |
| تقييم المخاطر | Haiku | تقييم سريع للمخاطر بتكلفة أقل |
| فحص البنود المفقودة | Haiku | فحص العقد لاكتشاف البنود الناقصة |
| توليد صياغة بديلة | Haiku | اقتراح بنود بديلة (متوازنة / لصالح العميل) |
| فحص الامتثال السعودي | Sonnet | فحص الامتثال لأنظمة PDPL والعمل والتجارة |
| إنشاء ملخص | Haiku | ملخص هيكلي للمستند القانوني |

### نقاط API
```
POST /api/v1/ai/analyze/contract/       # مراجعة العقد
POST /api/v1/ai/analyze/counter-position/ # تحليل الموقف المقابل
POST /api/v1/ai/analyze/demand-letter/  # تحليل خطاب المطالبة
POST /api/v1/ai/analyze/risk/           # تقييم المخاطر
POST /api/v1/ai/analyze/provisions/     # فحص البنود المفقودة
POST /api/v1/ai/analyze/compliance/     # فحص الامتثال
POST /api/v1/ai/generate/clause/        # توليد صياغة بديلة
POST /api/v1/ai/generate/summary/       # إنشاء ملخص
POST /api/v1/ai/estimate-cost/          # تقدير التكلفة قبل التنفيذ
GET  /api/v1/ai/usage/stats/            # إحصائيات الاستخدام
GET  /api/v1/ai/usage/budget/           # حالة الميزانية
```

### الإعداد
```bash
# 1. إضافة مفتاح API
export ANTHROPIC_API_KEY="sk-ant-..."

# 2. تشغيل الهجرة
python manage.py makemigrations ai_engine
python manage.py migrate

# 3. تثبيت المكتبة
pip install anthropic
```

### نموذج التكلفة
مكتب محاماة صغير (شخصين) يجري ~550 تحليل/شهر = **7-10 دولار/شهر** (~26-37 ريال)
مع التخزين المؤقت، التكلفة الفعلية أقل — وهذا أقل من تكلفة ساعة عمل واحدة لمحامي مبتدئ.

---

**تمكين** — بناء بواسطة فريق التطوير | 2025
