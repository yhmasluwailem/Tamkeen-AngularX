import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DashboardLayoutComponent } from '../../layouts/dashboard/dashboard-layout.component';
import { StoreService } from '../../core/services/store.service';
import { formatCurrency } from '../../core/utils/formatters';
import { SAUDI_COURTS } from '../../core/data/classifications';

@Component({
  selector: 'app-cases',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DashboardLayoutComponent],
  template: `
    <app-dashboard-layout>
      <div class="dga-page" dir="rtl">

        <!-- BREADCRUMB -->
        <nav class="dga-breadcrumb">
          <a routerLink="/home">إستعراض</a>
          <span class="sep">‹</span>
          <span>إدارة القضايا</span>
        </nav>

        <div class="dga-page-title">
          <h1>إدارة القضايا</h1>
          <a routerLink="/home" class="back-link">رجوع →</a>
        </div>

        <!-- MAIN LAYOUT: Content + Sidebar -->
        <div class="dga-layout">

          <!-- ═══ MAIN CONTENT ═══ -->
          <div class="dga-main">
            <div class="dga-content-card">

              <!-- Search Header -->
              <div class="search-header">
                <div class="search-title">
                  <i class="bi bi-search"></i>
                  <span>البحث في القضايا</span>
                </div>
                <span class="case-count">{{ filtered().length }} قضية</span>
              </div>

              <!-- Search Bar -->
              <div class="search-bar">
                <div class="search-input-wrap">
                  <input class="search-input" [ngModel]="search()" (ngModelChange)="search.set($event)" placeholder="ابحث في جميع القضايا">
                  <i class="bi bi-search search-icon"></i>
                </div>
              </div>

              <!-- Filters Row -->
              <div class="filters-row">
                <div class="sort-label">
                  <i class="bi bi-sort-down"></i>
                  <span>ترتيب حسب التاريخ (من جديد إلى قديم)</span>
                </div>
                <div class="filter-chips">
                  <select class="filter-chip" [ngModel]="filterCourt()" (ngModelChange)="filterCourt.set($event)">
                    <option value="">نوع المحكمة</option>
                    @for (c of saudiCourts; track c.id) {
                      <option [value]="c.id">{{ c.name }}</option>
                    }
                  </select>
                  <select class="filter-chip" [ngModel]="filterStatus()" (ngModelChange)="filterStatus.set($event)">
                    <option value="">حالة القضية</option>
                    <option value="active">نشطة</option>
                    <option value="pending">معلقة</option>
                    <option value="appealed">مستأنفة</option>
                    <option value="closed">مغلقة</option>
                  </select>
                  <select class="filter-chip" [ngModel]="filterAssignee()" (ngModelChange)="filterAssignee.set($event)">
                    <option value="">المحامي المسؤول</option>
                    @for (e of store.employees(); track e.id) {
                      <option [value]="e.id">{{ e.name }}</option>
                    }
                  </select>
                  <select class="filter-chip" [ngModel]="filterDate()" (ngModelChange)="filterDate.set($event)">
                    <option value="">التاريخ</option>
                    <option value="week">هذا الأسبوع</option>
                    <option value="month">هذا الشهر</option>
                    <option value="year">هذه السنة</option>
                  </select>
                </div>
              </div>

              <!-- Cards Grid -->
              <div class="cards-grid">
                @for (c of paginatedCases(); track c.id) {
                  <div class="case-card">
                    <div class="card-top">
                      <button class="bookmark-btn" (click)="toggleBookmark(c.id)">
                        <i [class]="bookmarks().has(c.id) ? 'bi bi-star-fill' : 'bi bi-star'"></i>
                      </button>
                      <span class="status-badge" [class]="'badge-' + c.status">
                        {{ getStatusLabel(c.status) }}
                      </span>
                    </div>

                    <h3 class="card-title">{{ c.title }}</h3>

                    <div class="card-meta">
                      <i class="bi bi-calendar-check"></i>
                      <span>{{ c.filingDate | date:'d MMMM, yyyy':'':'ar' }}</span>
                    </div>

                    <div class="card-info">
                      <div class="info-item">
                        <i class="bi bi-person"></i>
                        <span>{{ store.clientName(c.clientId) }}</span>
                      </div>
                    </div>

                    @if (c.assignedTo) {
                      <div class="card-assignee">
                        <i class="bi bi-person-badge"></i>
                        <span>{{ store.employeeName(c.assignedTo) }}</span>
                      </div>
                    }

                    <div class="card-court">
                      <i class="bi bi-building"></i>
                      <span>{{ getCourtName(c.courtType) }}</span>
                    </div>

                    <div class="card-actions">
                      <a [routerLink]="['/cases', c.id]" class="btn-outline">عرض التفاصيل</a>
                      <a [routerLink]="['/cases', c.id]" class="btn-primary" [queryParams]="{action: 'process'}">معالجة</a>
                    </div>
                  </div>
                } @empty {
                  <div class="empty-state">
                    <i class="bi bi-briefcase"></i>
                    <p>لا توجد قضايا مطابقة للبحث</p>
                  </div>
                }
              </div>

              <!-- Pagination -->
              @if (totalPages() > 1) {
                <div class="pagination-bar">
                  <span class="page-info">عرض {{ pageSize }} من {{ filtered().length }} قضية</span>
                  <div class="page-controls">
                    <button class="page-btn" (click)="prevPage()" [disabled]="currentPage() === 1">
                      <i class="bi bi-chevron-right"></i>
                    </button>
                    @for (p of visiblePages(); track p) {
                      @if (p === -1) {
                        <span class="page-ellipsis">...</span>
                      } @else {
                        <button class="page-num" [class.active]="p === currentPage()" (click)="currentPage.set(p)">{{ p }}</button>
                      }
                    }
                    <button class="page-btn" (click)="nextPage()" [disabled]="currentPage() === totalPages()">
                      <i class="bi bi-chevron-left"></i>
                    </button>
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- ═══ RIGHT SIDEBAR ═══ -->
          <div class="dga-sidebar">

            <!-- Sidebar Header -->
            <div class="sidebar-card sidebar-header-card">
              <div class="sidebar-title">
                <i class="bi bi-briefcase-fill"></i>
                <span>القضايا</span>
              </div>
            </div>

            <!-- Active Cases Section -->
            <div class="sidebar-card">
              <div class="sidebar-section-title">
                <i class="bi bi-clock-history"></i>
                <span>قضايا تحت الإجراء</span>
              </div>

              <div class="sidebar-category active-cat" (click)="setFilter('active')">
                <span class="cat-label">قضايا جارية</span>
                <span class="cat-badge">{{ activeCasesCount() }}</span>
                <div class="cat-bar"></div>
              </div>

              <div class="sidebar-items">
                <div class="sidebar-item" [class.selected]="filterStatus() === 'active'" (click)="setFilter('active')">
                  <span>القضايا النشطة</span>
                  <span class="item-count">{{ statusCounts().active }}</span>
                </div>
                <div class="sidebar-item" [class.selected]="filterStatus() === 'pending'" (click)="setFilter('pending')">
                  <span>القضايا المعلقة</span>
                  <span class="item-count">{{ statusCounts().pending }}</span>
                </div>
                <div class="sidebar-item" [class.selected]="filterStatus() === 'appealed'" (click)="setFilter('appealed')">
                  <span>القضايا المستأنفة</span>
                  <span class="item-count">{{ statusCounts().appealed }}</span>
                </div>
              </div>
            </div>

            <!-- Closed Cases Section -->
            <div class="sidebar-card">
              <div class="sidebar-section-title">
                <i class="bi bi-check-circle"></i>
                <span>قضايا مغلقة</span>
              </div>

              <div class="sidebar-items">
                <div class="sidebar-item" [class.selected]="filterStatus() === 'closed'" (click)="setFilter('closed')">
                  <span>القضايا المغلقة</span>
                  <span class="item-count">{{ statusCounts().closed }}</span>
                </div>
              </div>
            </div>

            <!-- New Case Button -->
            <button class="sidebar-add-btn" (click)="showWizard.set(true)">
              <i class="bi bi-plus-circle"></i>
              <span>قضية جديدة</span>
            </button>

            <!-- Did You Know Card -->
            @if (showTip()) {
              <div class="tip-card">
                <button class="tip-close" (click)="showTip.set(false)">
                  <i class="bi bi-x"></i>
                </button>
                <div class="tip-header">
                  <span>هل تعلم ؟</span>
                  <i class="bi bi-question-circle-fill tip-icon"></i>
                </div>
                <h4>تعيين محامي للقضية</h4>
                <p>يمكنك تعيين محامي مسؤول لكل قضية من خلال صفحة التفاصيل. المحامي المعين سيتلقى جميع التنبيهات الخاصة بالقضية.</p>
                <div class="tip-pagination">
                  <button class="tip-nav">←</button>
                  <span>1/2</span>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- ═══ ADD CASE WIZARD ═══ -->
        @if (showWizard()) {
          <div class="tmk-overlay" (click)="showWizard.set(false)">
            <div class="tmk-modal wizard-modal" (click)="$event.stopPropagation()">
              <div class="modal-header">
                <h3>قضية جديدة</h3>
                <button class="modal-close" (click)="showWizard.set(false)">
                  <i class="bi bi-x-lg"></i>
                </button>
              </div>

              <!-- Wizard Steps -->
              <div class="wizard-stepper">
                @for (s of steps; track s.id) {
                  <div class="wstep" [class.active]="step() === s.id" [class.done]="step() > s.id">
                    <div class="wstep-circle">
                      @if (step() > s.id) {
                        <i class="bi bi-check-lg"></i>
                      } @else {
                        {{ s.id }}
                      }
                    </div>
                    <span class="wstep-label">{{ s.title }}</span>
                    @if (!$last) {
                      <div class="wstep-line" [class.done]="step() > s.id"></div>
                    }
                  </div>
                }
              </div>

              <div class="modal-body">
                @if (step() === 1) {
                  <div class="form-section">
                    <div class="form-group">
                      <label>عنوان القضية <span class="req">*</span></label>
                      <input [(ngModel)]="f.title" class="dga-input" placeholder="مثال: نزاع تجاري">
                    </div>
                    <div class="form-row">
                      <div class="form-group">
                        <label>العميل <span class="req">*</span></label>
                        <select [(ngModel)]="f.clientId" class="dga-select">
                          <option value="">اختر العميل...</option>
                          @for (c of store.clients(); track c.id) {
                            <option [value]="c.id">{{ c.name }}</option>
                          }
                        </select>
                      </div>
                      <div class="form-group">
                        <label>الخصم <span class="req">*</span></label>
                        <input [(ngModel)]="f.opponent" class="dga-input" placeholder="اسم الخصم">
                      </div>
                    </div>
                    <div class="form-group">
                      <label>صفة العميل</label>
                      <div class="role-selector">
                        <label class="role-option" [class.selected]="f.partyRole==='plaintiff'">
                          <input type="radio" [(ngModel)]="f.partyRole" value="plaintiff" hidden>
                          <i class="bi bi-person"></i>
                          <span>مدعي</span>
                        </label>
                        <label class="role-option" [class.selected]="f.partyRole==='defendant'">
                          <input type="radio" [(ngModel)]="f.partyRole" value="defendant" hidden>
                          <i class="bi bi-shield"></i>
                          <span>مدعى عليه</span>
                        </label>
                      </div>
                    </div>
                    <div class="form-group">
                      <label>تعيين محامي مسؤول</label>
                      <select [(ngModel)]="f.assignedTo" class="dga-select">
                        <option value="">بدون تعيين</option>
                        @for (e of store.employees(); track e.id) {
                          <option [value]="e.id">{{ e.name }} — {{ getRoleLabel(e.role) }}</option>
                        }
                      </select>
                    </div>
                  </div>
                }
                @if (step() === 2) {
                  <div class="form-section">
                    <div class="form-group">
                      <label>المحكمة <span class="req">*</span></label>
                      <select [(ngModel)]="f.courtType" (ngModelChange)="f.category='';f.subtype=''" class="dga-select">
                        <option value="">اختر المحكمة...</option>
                        @for (c of saudiCourts; track c.id) {
                          <option [value]="c.id">{{ c.name }}</option>
                        }
                      </select>
                    </div>
                    <div class="form-group">
                      <label>التصنيف <span class="req">*</span></label>
                      <select [(ngModel)]="f.category" (ngModelChange)="f.subtype=''" class="dga-select" [disabled]="!f.courtType">
                        <option value="">اختر التصنيف...</option>
                        @for (c of getCats(); track c.id) {
                          <option [value]="c.id">{{ c.name }}</option>
                        }
                      </select>
                    </div>
                    <div class="form-group">
                      <label>نوع الدعوى <span class="req">*</span></label>
                      <select [(ngModel)]="f.subtype" class="dga-select highlight" [disabled]="!f.category">
                        <option value="">اختر نوع الدعوى...</option>
                        @for (s of getSubs(); track s.id) {
                          <option [value]="s.id">{{ s.name }}</option>
                        }
                      </select>
                    </div>
                  </div>
                }
                @if (step() === 3) {
                  <div class="form-section">
                    @if (getSubObj()) {
                      <div class="smart-alert">
                        <i class="bi bi-exclamation-triangle"></i>
                        <span>مهلة الاستئناف لـ <strong>{{ getSubObj()!.name }}</strong>: <strong>{{ getSubObj()!.appealDeadline }} يوماً</strong></span>
                      </div>
                    }
                    <div class="form-row">
                      <div class="form-group">
                        <label>تاريخ البدء</label>
                        <input type="date" [(ngModel)]="f.filingDate" class="dga-input">
                      </div>
                      <div class="form-group">
                        <label class="text-danger">انتهاء الوكالة <span class="req">*</span></label>
                        <input type="date" [(ngModel)]="f.agencyExpiry" class="dga-input danger-border">
                      </div>
                    </div>
                    <div class="form-group">
                      <label>رقم ناجز</label>
                      <input [(ngModel)]="f.najizNumber" class="dga-input mono" dir="ltr">
                    </div>
                    <div class="form-group">
                      <label>ملاحظات</label>
                      <textarea [(ngModel)]="f.description" class="dga-textarea" rows="3"></textarea>
                    </div>
                  </div>
                }
              </div>

              <div class="modal-footer">
                <button class="btn-outline" (click)="prevStep()" [disabled]="step()===1">
                  <i class="bi bi-arrow-right"></i>
                  السابق
                </button>
                @if (step() < 3) {
                  <button class="btn-primary" (click)="nextStep()">
                    التالي
                    <i class="bi bi-arrow-left"></i>
                  </button>
                } @else {
                  <button class="btn-primary" (click)="submit()">
                    <i class="bi bi-check-lg"></i>
                    حفظ القضية
                  </button>
                }
              </div>
            </div>
          </div>
        }

        <!-- ═══ SUCCESS MODAL ═══ -->
        @if (showSuccess()) {
          <div class="tmk-overlay" (click)="showSuccess.set(false)">
            <div class="success-modal" (click)="$event.stopPropagation()">
              <div class="success-icon">
                <i class="bi bi-check-lg"></i>
              </div>
              <h2>تم إضافة القضية بنجاح</h2>
              <p>تم إضافة القضية الجديدة بنجاح، يمكنك الإطلاع عليها من خلال صفحة <a routerLink="/cases">القضايا الجارية</a></p>
              <button class="btn-outline" (click)="showSuccess.set(false)">العودة الى صفحة القضايا</button>
            </div>
          </div>
        }

      </div>
    </app-dashboard-layout>
  `,
  styles: [`
    .dga-page { max-width: 1400px; margin: 0 auto; }

    /* ── Breadcrumb ── */
    .dga-breadcrumb { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; color: var(--text-secondary, #6b7280); margin-bottom: 0.5rem; }
    .dga-breadcrumb a { color: var(--text-secondary, #6b7280); text-decoration: none; }
    .dga-breadcrumb a:hover { text-decoration: underline; }
    .dga-breadcrumb .sep { opacity: 0.5; }

    .dga-page-title { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
    .dga-page-title h1 { font-size: 1.5rem; font-weight: 800; margin: 0; }
    .back-link { color: var(--text-secondary, #6b7280); text-decoration: none; font-size: 0.9rem; display: flex; align-items: center; gap: 0.3rem; }
    .back-link:hover { color: var(--tmk-primary, #1B8354); }

    /* ── Main Layout ── */
    .dga-layout { display: grid; grid-template-columns: 1fr 300px; gap: 1.5rem; }
    @media (max-width: 1000px) { .dga-layout { grid-template-columns: 1fr; } .dga-sidebar { order: -1; } }

    /* ── Content Card ── */
    .dga-content-card { background: var(--card-bg, #fff); border-radius: 12px; border: 1px solid rgba(0,0,0,0.08); overflow: hidden; }

    .search-header { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 1.5rem; border-bottom: 1px solid rgba(0,0,0,0.06); }
    .search-title { display: flex; align-items: center; gap: 0.5rem; font-weight: 700; font-size: 1.05rem; }
    .search-title i { color: var(--tmk-primary, #1B8354); }
    .case-count { font-size: 0.85rem; color: var(--text-secondary, #6b7280); }

    .search-bar { padding: 1rem 1.5rem; }
    .search-input-wrap { position: relative; }
    .search-input { width: 100%; padding: 0.75rem 1rem 0.75rem 2.5rem; border: 1px solid rgba(0,0,0,0.12); border-radius: 8px; font-family: inherit; font-size: 0.9rem; background: var(--card-bg, #fff); box-sizing: border-box; }
    .search-input:focus { outline: none; border-color: var(--tmk-primary, #1B8354); box-shadow: 0 0 0 3px rgba(27,131,84,0.1); }
    .search-icon { position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); color: var(--text-secondary, #6b7280); }

    .filters-row { display: flex; justify-content: space-between; align-items: center; padding: 0 1.5rem 1rem; gap: 1rem; flex-wrap: wrap; }
    .sort-label { display: flex; align-items: center; gap: 0.4rem; font-size: 0.8rem; color: var(--text-secondary, #6b7280); background: rgba(0,0,0,0.03); padding: 0.4rem 0.75rem; border-radius: 6px; }
    .filter-chips { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .filter-chip { padding: 0.4rem 0.75rem; border: 1px solid rgba(0,0,0,0.1); border-radius: 6px; background: var(--card-bg, #fff); font-family: inherit; font-size: 0.8rem; color: var(--text-primary); cursor: pointer; }
    .filter-chip:focus { outline: none; border-color: var(--tmk-primary, #1B8354); }

    /* ── Cards Grid ── */
    .cards-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; padding: 1rem 1.5rem; }
    @media (max-width: 1200px) { .cards-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 700px) { .cards-grid { grid-template-columns: 1fr; } }

    .case-card { background: var(--card-bg, #fff); border: 1px solid rgba(0,0,0,0.08); border-radius: 12px; padding: 1.25rem; transition: all 0.2s; position: relative; }
    .case-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.08); transform: translateY(-2px); }

    .card-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; }
    .bookmark-btn { background: none; border: none; cursor: pointer; color: var(--text-secondary, #6b7280); font-size: 1.1rem; padding: 0; }
    .bookmark-btn:hover { color: #f59e0b; }
    .bi-star-fill { color: #f59e0b; }

    .status-badge { padding: 0.2rem 0.65rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600; }
    .badge-active { background: rgba(27,131,84,0.1); color: var(--tmk-primary, #1B8354); border: 1px solid rgba(27,131,84,0.2); }
    .badge-pending { background: rgba(245,158,11,0.1); color: #d97706; border: 1px solid rgba(245,158,11,0.2); }
    .badge-appealed { background: rgba(59,130,246,0.1); color: #2563eb; border: 1px solid rgba(59,130,246,0.2); }
    .badge-closed { background: rgba(107,114,128,0.1); color: #4b5563; border: 1px solid rgba(107,114,128,0.2); }

    .card-title { font-size: 1rem; font-weight: 700; margin: 0 0 0.75rem; text-align: center; line-height: 1.5; }

    .card-meta { display: flex; align-items: center; justify-content: center; gap: 0.4rem; font-size: 0.8rem; color: var(--text-secondary, #6b7280); margin-bottom: 0.75rem; }
    .card-meta i { font-size: 0.85rem; }

    .card-info, .card-assignee, .card-court { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; padding: 0.35rem 0; color: var(--text-secondary, #6b7280); }
    .card-info i, .card-assignee i, .card-court i { color: var(--tmk-primary, #1B8354); font-size: 0.9rem; width: 1.25rem; text-align: center; }
    .card-assignee { color: #2563eb; }
    .card-assignee i { color: #2563eb; }

    .card-actions { display: flex; gap: 0.5rem; margin-top: 1rem; }
    .btn-outline { flex: 1; padding: 0.55rem 0.75rem; border: 1px solid rgba(0,0,0,0.12); border-radius: 8px; background: transparent; color: var(--text-primary); font-family: inherit; font-size: 0.8rem; font-weight: 600; cursor: pointer; text-align: center; text-decoration: none; transition: all 0.2s; display: inline-flex; align-items: center; justify-content: center; gap: 0.3rem; }
    .btn-outline:hover { background: rgba(0,0,0,0.03); }
    .btn-outline:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-primary { flex: 1; padding: 0.55rem 0.75rem; border: none; border-radius: 8px; background: var(--tmk-primary, #1B8354); color: white; font-family: inherit; font-size: 0.8rem; font-weight: 600; cursor: pointer; text-align: center; text-decoration: none; transition: all 0.2s; display: inline-flex; align-items: center; justify-content: center; gap: 0.3rem; }
    .btn-primary:hover { background: var(--tmk-primary-dark, #166A45); }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

    .empty-state { grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--text-secondary, #6b7280); }
    .empty-state i { font-size: 3rem; display: block; margin-bottom: 0.75rem; opacity: 0.3; }

    /* ── Pagination ── */
    .pagination-bar { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.5rem; border-top: 1px solid rgba(0,0,0,0.06); }
    .page-info { font-size: 0.8rem; color: var(--text-secondary, #6b7280); }
    .page-controls { display: flex; align-items: center; gap: 0.25rem; }
    .page-btn { width: 2rem; height: 2rem; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(0,0,0,0.1); border-radius: 6px; background: var(--card-bg, #fff); cursor: pointer; font-size: 0.75rem; }
    .page-btn:disabled { opacity: 0.3; cursor: not-allowed; }
    .page-num { width: 2rem; height: 2rem; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(0,0,0,0.1); border-radius: 6px; background: var(--card-bg, #fff); cursor: pointer; font-size: 0.85rem; font-weight: 600; font-family: inherit; }
    .page-num.active { background: var(--tmk-primary, #1B8354); color: white; border-color: var(--tmk-primary, #1B8354); }
    .page-ellipsis { padding: 0 0.25rem; color: var(--text-secondary, #6b7280); }

    /* ── Sidebar ── */
    .dga-sidebar { display: flex; flex-direction: column; gap: 1rem; }

    .sidebar-card { background: var(--card-bg, #fff); border-radius: 12px; border: 1px solid rgba(0,0,0,0.08); padding: 1.25rem; }

    .sidebar-header-card { padding: 1.5rem; }
    .sidebar-title { display: flex; align-items: center; gap: 0.75rem; font-size: 1.15rem; font-weight: 700; }
    .sidebar-title i { color: var(--tmk-primary, #1B8354); font-size: 1.25rem; }

    .sidebar-section-title { display: flex; align-items: center; gap: 0.5rem; font-size: 0.9rem; font-weight: 600; margin-bottom: 1rem; padding-bottom: 0.75rem; border-bottom: 1px solid rgba(0,0,0,0.06); }
    .sidebar-section-title i { color: var(--tmk-primary, #1B8354); }

    .active-cat { position: relative; padding: 0.75rem; margin-bottom: 0.75rem; cursor: pointer; background: rgba(27,131,84,0.03); border-radius: 8px; border: 1px solid rgba(27,131,84,0.1); }
    .cat-label { font-size: 0.9rem; font-weight: 700; }
    .cat-badge { position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%); background: var(--card-bg, #fff); border: 1px solid rgba(0,0,0,0.1); border-radius: 4px; padding: 0.1rem 0.4rem; font-size: 0.75rem; font-weight: 700; }
    .cat-bar { position: absolute; right: 0; top: 0; bottom: 0; width: 3px; background: var(--tmk-primary, #1B8354); border-radius: 3px 0 0 3px; }

    .sidebar-items { display: flex; flex-direction: column; gap: 0.25rem; }
    .sidebar-item { display: flex; justify-content: space-between; align-items: center; padding: 0.6rem 0.75rem; border-radius: 6px; cursor: pointer; font-size: 0.85rem; transition: all 0.15s; }
    .sidebar-item:hover { background: rgba(0,0,0,0.03); }
    .sidebar-item.selected { background: rgba(27,131,84,0.06); color: var(--tmk-primary, #1B8354); font-weight: 600; }
    .item-count { font-weight: 600; color: var(--text-secondary, #6b7280); font-size: 0.8rem; }

    .sidebar-add-btn { display: flex; align-items: center; justify-content: center; gap: 0.5rem; width: 100%; padding: 0.85rem; border: 2px dashed rgba(27,131,84,0.3); border-radius: 12px; background: rgba(27,131,84,0.03); color: var(--tmk-primary, #1B8354); font-family: inherit; font-size: 0.9rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
    .sidebar-add-btn:hover { background: rgba(27,131,84,0.08); border-color: rgba(27,131,84,0.5); }

    /* ── Tip Card ── */
    .tip-card { background: var(--card-bg, #fff); border-radius: 12px; border: 1px solid rgba(0,0,0,0.08); padding: 1.25rem; position: relative; }
    .tip-close { position: absolute; top: 0.75rem; left: 0.75rem; background: none; border: none; cursor: pointer; color: var(--text-secondary, #6b7280); font-size: 1rem; }
    .tip-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; }
    .tip-header span { font-size: 0.85rem; font-weight: 700; }
    .tip-icon { color: var(--tmk-primary, #1B8354); font-size: 1.5rem; }
    .tip-card h4 { font-size: 0.9rem; font-weight: 700; margin: 0 0 0.5rem; }
    .tip-card p { font-size: 0.8rem; color: var(--text-secondary, #6b7280); line-height: 1.6; margin: 0 0 0.75rem; }
    .tip-pagination { display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem; color: var(--text-secondary, #6b7280); }
    .tip-nav { background: none; border: none; cursor: pointer; font-size: 1rem; padding: 0; color: var(--text-secondary, #6b7280); }

    /* ── Modal ── */
    .tmk-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); z-index: 2000; display: flex; align-items: center; justify-content: center; animation: fadeIn 0.2s; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

    .tmk-modal { background: var(--card-bg, #fff); border-radius: 16px; width: 90%; max-width: 650px; max-height: 90vh; overflow-y: auto; animation: modalIn 0.3s; }
    @keyframes modalIn { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }

    .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 1.5rem; border-bottom: 1px solid rgba(0,0,0,0.08); }
    .modal-header h3 { font-size: 1.15rem; font-weight: 700; margin: 0; }
    .modal-close { background: none; border: none; cursor: pointer; color: var(--text-secondary, #6b7280); font-size: 1rem; width: 2rem; height: 2rem; display: flex; align-items: center; justify-content: center; border-radius: 6px; }
    .modal-close:hover { background: rgba(0,0,0,0.05); }
    .modal-body { padding: 1.5rem; }
    .modal-footer { display: flex; justify-content: space-between; padding: 1rem 1.5rem; border-top: 1px solid rgba(0,0,0,0.08); }

    /* ── Wizard Stepper ── */
    .wizard-stepper { display: flex; align-items: center; justify-content: center; padding: 1.25rem 1.5rem 0; gap: 0; }
    .wstep { display: flex; align-items: center; gap: 0.5rem; }
    .wstep-circle { width: 2rem; height: 2rem; border-radius: 50%; border: 2px solid #d1d5db; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.8rem; color: #9ca3af; flex-shrink: 0; transition: all 0.2s; }
    .wstep.active .wstep-circle { border-color: var(--tmk-primary, #1B8354); background: var(--tmk-primary, #1B8354); color: white; }
    .wstep.done .wstep-circle { border-color: var(--tmk-primary, #1B8354); background: rgba(27,131,84,0.1); color: var(--tmk-primary, #1B8354); }
    .wstep-label { font-size: 0.8rem; color: var(--text-secondary, #6b7280); white-space: nowrap; }
    .wstep.active .wstep-label { color: var(--tmk-primary, #1B8354); font-weight: 600; }
    .wstep-line { width: 3rem; height: 2px; background: #e5e7eb; margin: 0 0.5rem; flex-shrink: 0; }
    .wstep-line.done { background: var(--tmk-primary, #1B8354); }

    /* ── Form ── */
    .form-section { display: flex; flex-direction: column; gap: 0.25rem; }
    .form-group { margin-bottom: 0.75rem; }
    .form-group label { display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.35rem; color: var(--text-primary); }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .req { color: #ef4444; }
    .text-danger { color: #ef4444; }

    .dga-input, .dga-select, .dga-textarea { width: 100%; padding: 0.65rem 0.85rem; border: 1px solid rgba(0,0,0,0.15); border-radius: 8px; font-family: inherit; font-size: 0.9rem; background: var(--card-bg, #fff); box-sizing: border-box; transition: all 0.2s; }
    .dga-input:focus, .dga-select:focus, .dga-textarea:focus { outline: none; border-color: var(--tmk-primary, #1B8354); box-shadow: 0 0 0 3px rgba(27,131,84,0.1); }
    .dga-select.highlight { border-color: rgba(27,131,84,0.3); background: rgba(27,131,84,0.02); }
    .danger-border { border-color: rgba(239,68,68,0.3) !important; }
    .mono { font-family: monospace; }

    .role-selector { display: flex; gap: 0.75rem; }
    .role-option { flex: 1; padding: 0.85rem; border: 2px solid rgba(0,0,0,0.08); border-radius: 10px; text-align: center; cursor: pointer; font-weight: 600; font-size: 0.9rem; display: flex; align-items: center; justify-content: center; gap: 0.5rem; transition: all 0.2s; }
    .role-option.selected { border-color: var(--tmk-primary, #1B8354); background: rgba(27,131,84,0.05); color: var(--tmk-primary, #1B8354); }
    .role-option i { font-size: 1rem; }

    .smart-alert { background: rgba(245,158,11,0.06); border: 1px solid rgba(245,158,11,0.2); border-radius: 8px; padding: 0.75rem 1rem; font-size: 0.85rem; color: #92400e; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem; }
    .smart-alert i { font-size: 1rem; color: #f59e0b; }

    /* ── Success Modal ── */
    .success-modal { background: var(--card-bg, #fff); border-radius: 16px; width: 90%; max-width: 500px; padding: 3rem 2rem; text-align: center; animation: modalIn 0.3s; }
    .success-icon { width: 5rem; height: 5rem; border-radius: 12px; background: var(--tmk-primary, #1B8354); color: white; display: flex; align-items: center; justify-content: center; font-size: 2.5rem; margin: 0 auto 1.5rem; }
    .success-modal h2 { font-size: 1.35rem; font-weight: 700; margin: 0 0 1rem; }
    .success-modal p { font-size: 0.9rem; color: var(--text-secondary, #6b7280); line-height: 1.7; margin: 0 0 1.5rem; }
    .success-modal a { color: var(--tmk-primary, #1B8354); text-decoration: underline; font-weight: 600; }
    .success-modal .btn-outline { display: inline-flex; padding: 0.7rem 2rem; }

    /* ── Dark Mode ── */
    :host-context([data-theme="dark"]) {
      .dga-content-card, .sidebar-card, .case-card, .tip-card { background: var(--card-bg); border-color: var(--border-light, #384250); }
      .search-input, .filter-chip { background: var(--card-bg); color: var(--text-primary); border-color: var(--border-light, #384250); }
      .search-header, .pagination-bar { border-color: var(--border-light, #384250); }
      .case-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.2); }
      .sort-label { background: rgba(255,255,255,0.04); }
      .sidebar-item:hover { background: rgba(255,255,255,0.04); }
      .active-cat { background: rgba(27,131,84,0.08); border-color: rgba(27,131,84,0.2); }
      .page-btn, .page-num { background: var(--card-bg); border-color: var(--border-light, #384250); color: var(--text-primary); }
      .dga-input, .dga-select, .dga-textarea { background: var(--card-bg); color: var(--text-primary); border-color: var(--border-light, #384250); }
      .role-option { border-color: var(--border-light, #384250); }
      .btn-outline { border-color: var(--border-light, #384250); color: var(--text-primary); }
      .btn-outline:hover { background: rgba(255,255,255,0.04); }
    }
  `]
})
export class CasesComponent {
  store = inject(StoreService);
  saudiCourts = SAUDI_COURTS;

  search = signal('');
  filterStatus = signal('');
  filterCourt = signal('');
  filterAssignee = signal('');
  filterDate = signal('');
  currentPage = signal(1);
  pageSize = 9;

  showWizard = signal(false);
  showSuccess = signal(false);
  showTip = signal(true);
  step = signal(1);
  bookmarks = signal<Set<string>>(new Set());

  steps = [{ id: 1, title: 'الأطراف' }, { id: 2, title: 'التصنيف' }, { id: 3, title: 'المواعيد' }];
  f = { title: '', clientId: '', opponent: '', partyRole: 'plaintiff', courtType: '', category: '', subtype: '', filingDate: new Date().toISOString().split('T')[0], agencyExpiry: '', najizNumber: '', description: '', assignedTo: '' };

  statusCounts = computed(() => {
    const cases = this.store.cases();
    return {
      active: cases.filter(c => c.status === 'active').length,
      pending: cases.filter(c => c.status === 'pending').length,
      appealed: cases.filter(c => c.status === 'appealed').length,
      closed: cases.filter(c => c.status === 'closed').length,
    };
  });

  activeCasesCount = computed(() => {
    const c = this.statusCounts();
    return c.active + c.pending + c.appealed;
  });

  filtered = computed(() => {
    let list = this.store.cases();
    const status = this.filterStatus();
    const court = this.filterCourt();
    const assignee = this.filterAssignee();
    const q = this.search().toLowerCase();
    const dateFilter = this.filterDate();
    if (status) list = list.filter(c => c.status === status);
    if (court) list = list.filter(c => c.courtType === court);
    if (assignee) list = list.filter(c => c.assignedTo === assignee);
    if (q) list = list.filter(c => c.title.toLowerCase().includes(q) || (c.najizNumber || '').includes(q) || this.store.clientName(c.clientId).toLowerCase().includes(q));
    if (dateFilter) {
      const now = new Date();
      const cutoff = new Date();
      if (dateFilter === 'week') cutoff.setDate(now.getDate() - 7);
      else if (dateFilter === 'month') cutoff.setMonth(now.getMonth() - 1);
      else if (dateFilter === 'year') cutoff.setFullYear(now.getFullYear() - 1);
      list = list.filter(c => new Date(c.createdAt) >= cutoff);
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  });

  totalPages = computed(() => Math.ceil(this.filtered().length / this.pageSize));

  paginatedCases = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filtered().slice(start, start + this.pageSize);
  });

  visiblePages = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: number[] = [];
    if (total <= 5) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      pages.push(1);
      if (current > 3) pages.push(-1);
      for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
      if (current < total - 2) pages.push(-1);
      pages.push(total);
    }
    return pages;
  });

  fmtCurrency = formatCurrency;
  getCourtName(t: string) { return SAUDI_COURTS.find(c => c.id === t)?.name || '—'; }
  getStatusLabel(s: string) { return { active: 'نشطة', pending: 'معلقة', closed: 'مغلقة', appealed: 'مستأنفة' }[s] || s; }
  getRoleLabel(r: string) { return { admin: 'مدير', senior_lawyer: 'محامي أول', lawyer: 'محامي', paralegal: 'مساعد قانوني', secretary: 'سكرتير' }[r] || r; }
  getCats() { return SAUDI_COURTS.find(c => c.id === this.f.courtType)?.categories || []; }
  getSubs() { const cat = this.getCats().find((c: any) => c.id === this.f.category); return cat?.subtypes || []; }
  getSubObj() { return this.getSubs().find((s: any) => s.id === this.f.subtype); }

  setFilter(status: string) {
    this.filterStatus.set(this.filterStatus() === status ? '' : status);
    this.currentPage.set(1);
  }

  toggleBookmark(id: string) {
    this.bookmarks.update(set => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  prevPage() { if (this.currentPage() > 1) this.currentPage.update(p => p - 1); }
  nextPage() { if (this.currentPage() < this.totalPages()) this.currentPage.update(p => p + 1); }

  prevStep() { this.step.update(s => Math.max(1, s - 1)); }
  nextStep() {
    if (this.step() === 1 && (!this.f.title || !this.f.clientId || !this.f.opponent)) return;
    if (this.step() === 2 && (!this.f.courtType || !this.f.category || !this.f.subtype)) return;
    this.step.update(s => Math.min(s + 1, 3));
  }

  submit() {
    if (!this.f.title || !this.f.clientId) return;
    this.store.addCase({
      id: this.store.generateId('CASE'), title: this.f.title, clientId: this.f.clientId,
      status: 'active', courtType: this.f.courtType as any, caseCategory: this.f.category,
      caseSubCategory: this.f.subtype, partyRole: this.f.partyRole as any,
      opponents: this.f.opponent ? [this.f.opponent] : [], filingDate: this.f.filingDate,
      agencyExpiry: this.f.agencyExpiry, najizNumber: this.f.najizNumber, description: this.f.description,
      assignedTo: this.f.assignedTo || undefined,
      agreedFee: 0, paidAmount: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    } as any);
    this.showWizard.set(false);
    this.showSuccess.set(true);
    this.step.set(1);
    this.f = { title: '', clientId: '', opponent: '', partyRole: 'plaintiff', courtType: '', category: '', subtype: '', filingDate: new Date().toISOString().split('T')[0], agencyExpiry: '', najizNumber: '', description: '', assignedTo: '' };
  }
}
