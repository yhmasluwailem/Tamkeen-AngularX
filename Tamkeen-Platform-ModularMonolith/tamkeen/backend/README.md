# Tamkeen Backend — Django Modular Monolith

## Apps Structure
| App | Models | Description |
|-----|--------|-------------|
| accounts | User | Custom user with roles |
| workflow | WorkflowTemplate, StageTemplate, GateConditionTemplate, TaskTemplate, DocumentRequirement, CaseWorkflow, StageInstance, GateConditionInstance, StageTransitionLog, CaseExceptionExit | Stage-Gate workflow engine |
| cases | Case, Lead | Case and lead management |
| tasks | Task, TaskRevision, TaskComment | Branch & Merge task system |
| clients | Client, Communication | Client management |
| finance | Invoice, InvoiceItem, Expense, FinancialTransaction | Financial management |
| documents | Document | Document management |
| messages_app | Comment, Notification | Comments & notifications |
| calendar_app | Session | Court sessions |
| employees | (extends User) | Employee extensions |
| settings_app | SystemSetting | System configuration |

## Key Design Decisions
- All models use UUIDs (not auto-increment)
- SoftDeleteModel for legal records (audit compliance)
- AuditMixin: created_by, updated_by tracking
- Task API: start(), submit(), review(approve/return)
- IsManagerOrAssignee permission class
