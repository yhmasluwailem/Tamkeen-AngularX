import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DashboardLayoutComponent } from '../../layouts/dashboard/dashboard-layout.component';
import { StoreService } from '../../core/services/store.service';

const DOC_CATEGORIES = [
  { id: 'contracts', label: 'عقود', icon: 'bi-file-earmark-text' },
  { id: 'agencies', label: 'وكالات', icon: 'bi-file-earmark-lock' },
  { id: 'pleadings', label: 'لوائح ومذكرات', icon: 'bi-bank' },
  { id: 'judgments', label: 'أحكام', icon: 'bi-hammer' },
  { id: 'identities', label: 'إثبات هوية', icon: 'bi-person-vcard' },
  { id: 'evidence', label: 'أدلة ومستندات إثبات', icon: 'bi-search' },
  { id: 'invoices', label: 'فواتير', icon: 'bi-receipt' },
  { id: 'receipts', label: 'إيصالات', icon: 'bi-cash-stack' },
  { id: 'other', label: 'أخرى', icon: 'bi-file-earmark' },
];

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DashboardLayoutComponent],
  template: `
    <app-dashboard-layout>
      <div class="page" dir="rtl">

        <nav class="dga-breadcrumb">
          <a routerLink="/home">إستعراض</a>
          <span class="sep">‹</span>
          <span>إدارة المستندات</span>
        </nav>

        <div class="page-header">
          <div>
            <h1>إدارة المستندات</h1>
            <p>{{ store.documents().length }} مستند في النظام</p>
          </div>
          <button class="dga-btn primary" (click)="showAdd.set(true)">
            <i class="bi bi-upload"></i> رفع مستند
          </button>
        </div>

        <!-- Stats -->
        <div class="doc-stats">
          @for (stat of docStats(); track stat.label) {
            <div class="stat-card">
              <div class="stat-icon" [style.background]="stat.bg"><i class="bi" [class]="stat.icon"></i></div>
              <div><strong>{{ stat.count }}</strong><small>{{ stat.label }}</small></div>
            </div>
          }
        </div>

        <!-- Category Filter -->
        <div class="cat-filter">
          <button [class.active]="filterCat() === ''" (click)="filterCat.set('')"><i class="bi bi-grid-3x3-gap"></i> الكل</button>
          @for (cat of uniqueCategories; track cat.id) {
            <button [class.active]="filterCat() === cat.id" (click)="filterCat.set(cat.id)"><i class="bi" [class]="cat.icon"></i> {{ cat.label }}</button>
          }
        </div>

        <!-- Toolbar -->
        <div class="toolbar">
          <div class="search-box">
            <i class="bi bi-search"></i>
            <input class="dga-input" [ngModel]="searchQuery()" (ngModelChange)="searchQuery.set($event)" placeholder="بحث في المستندات...">
          </div>
          <div class="view-toggle">
            <button [class.active]="viewMode() === 'grid'" (click)="viewMode.set('grid')"><i class="bi bi-grid"></i></button>
            <button [class.active]="viewMode() === 'list'" (click)="viewMode.set('list')"><i class="bi bi-list-ul"></i></button>
          </div>
        </div>

        <!-- Drop Zone -->
        <div class="drop-zone" [class.drag-over]="isDragOver()"
          (dragover)="onDragOver($event)" (dragleave)="onDragLeave($event)" (drop)="onDrop($event)" (click)="showAdd.set(true)">
          <div class="dz-content">
            <div class="dz-icon"><i class="bi bi-cloud-arrow-up"></i></div>
            <p>اسحب الملفات هنا أو اضغط لرفع مستند</p>
            <small>PDF, DOCX, XLSX, JPG, PNG — حتى 10 ميجابايت</small>
          </div>
        </div>

        <!-- GRID VIEW -->
        @if (viewMode() === 'grid') {
          <div class="docs-grid">
            @for (doc of filtered(); track doc.id) {
              <div class="doc-card" [class.selected]="selectedDoc() === doc.id" (click)="selectedDoc.set(doc.id === selectedDoc() ? '' : doc.id)">
                <div class="dc-icon-wrap">
                  <i class="bi" [class]="getFileIconClass(doc.type)"></i>
                  <span class="dc-ext">{{ (doc.type || 'pdf').toUpperCase() }}</span>
                </div>
                <div class="dc-body">
                  <strong class="dc-title">{{ doc.title }}</strong>
                  <small class="dc-meta">{{ formatFileSize(doc.fileSize) }} · {{ doc.createdAt | date:'yyyy/MM/dd':'':'ar' }}</small>
                  <div class="dc-links">
                    @if (doc.caseId) {
                      <a [routerLink]="['/cases', doc.caseId]" class="dc-link" (click)="$event.stopPropagation()"><i class="bi bi-briefcase"></i> {{ getCaseTitle(doc.caseId) }}</a>
                    }
                    @if (doc.clientId) {
                      <a [routerLink]="['/clients', doc.clientId]" class="dc-link" (click)="$event.stopPropagation()"><i class="bi bi-person"></i> {{ store.clientName(doc.clientId) }}</a>
                    }
                  </div>
                </div>
                <div class="dc-actions">
                  <span class="dc-cat"><i class="bi" [class]="getCatIcon(doc.category)"></i> {{ getCatLabel(doc.category) }}</span>
                  <div class="dc-btns">
                    <button class="icon-btn" title="تعديل" (click)="editDoc(doc); $event.stopPropagation()"><i class="bi bi-pencil"></i></button>
                    <button class="icon-btn danger" title="حذف" (click)="confirmDelete(doc); $event.stopPropagation()"><i class="bi bi-trash3"></i></button>
                  </div>
                </div>
              </div>
            } @empty {
              <div class="empty-state">
                <i class="bi bi-folder2-open"></i>
                <p>لا توجد مستندات</p>
                <small>ابدأ برفع المستندات عبر السحب والإفلات أو الضغط على "رفع مستند"</small>
              </div>
            }
          </div>
        }

        <!-- LIST VIEW -->
        @if (viewMode() === 'list') {
          <div class="table-wrap">
            <table class="dga-table">
              <thead><tr><th>المستند</th><th>التصنيف</th><th>القضية</th><th>العميل</th><th>الحجم</th><th>التاريخ</th><th></th></tr></thead>
              <tbody>
                @for (doc of filtered(); track doc.id) {
                  <tr>
                    <td><div class="td-doc"><i class="bi" [class]="getFileIconClass(doc.type)"></i><div><strong>{{ doc.title }}</strong><small>{{ (doc.type || 'pdf').toUpperCase() }}</small></div></div></td>
                    <td><span class="cat-tag"><i class="bi" [class]="getCatIcon(doc.category)"></i> {{ getCatLabel(doc.category) }}</span></td>
                    <td>@if (doc.caseId) { <a [routerLink]="['/cases', doc.caseId]" class="table-link">{{ getCaseTitle(doc.caseId) }}</a> } @else { <span class="muted">—</span> }</td>
                    <td>@if (doc.clientId) { <a [routerLink]="['/clients', doc.clientId]" class="table-link">{{ store.clientName(doc.clientId) }}</a> } @else { <span class="muted">—</span> }</td>
                    <td class="mono">{{ formatFileSize(doc.fileSize) }}</td>
                    <td>{{ doc.createdAt | date:'yyyy/MM/dd':'':'ar' }}</td>
                    <td><div class="dc-btns"><button class="icon-btn" (click)="editDoc(doc)"><i class="bi bi-pencil"></i></button><button class="icon-btn danger" (click)="confirmDelete(doc)"><i class="bi bi-trash3"></i></button></div></td>
                  </tr>
                } @empty { <tr><td colspan="7" class="empty-td">لا توجد مستندات</td></tr> }
              </tbody>
            </table>
          </div>
        }

        <!-- ADD / EDIT DIALOG -->
        @if (showAdd() || showEdit()) {
          <div class="tmk-overlay" (click)="closeModal()">
            <div class="tmk-modal" (click)="$event.stopPropagation()">
              <div class="modal-header">
                <h3><i class="bi bi-file-earmark-plus"></i> {{ showEdit() ? 'تعديل مستند' : 'رفع مستند جديد' }}</h3>
                <button class="modal-close" (click)="closeModal()"><i class="bi bi-x-lg"></i></button>
              </div>
              <div class="modal-body">
                <div class="form-group"><label>عنوان المستند <span class="req">*</span></label>
                  <input [(ngModel)]="f.title" class="dga-input" placeholder="مثال: صك الحكم، توكيل رسمي">
                </div>
                <div class="form-row">
                  <div class="form-group"><label>التصنيف</label>
                    <select [(ngModel)]="f.category" class="dga-select">@for (cat of categories; track cat.id) { <option [value]="cat.id">{{ cat.label }}</option> }</select>
                  </div>
                  <div class="form-group"><label>نوع الملف</label>
                    <select [(ngModel)]="f.type" class="dga-select">
                      <option value="pdf">PDF</option><option value="docx">DOCX</option><option value="xlsx">XLSX</option><option value="jpg">صورة JPG</option><option value="png">صورة PNG</option><option value="other">أخرى</option>
                    </select>
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group"><label>القضية المرتبطة</label>
                    <select [(ngModel)]="f.caseId" class="dga-select"><option value="">بدون</option>@for (c of store.cases(); track c.id) { <option [value]="c.id">{{ c.title }}</option> }</select>
                  </div>
                  <div class="form-group"><label>العميل المرتبط</label>
                    <select [(ngModel)]="f.clientId" class="dga-select"><option value="">بدون</option>@for (c of store.clients(); track c.id) { <option [value]="c.id">{{ c.name }}</option> }</select>
                  </div>
                </div>
                @if (!showEdit()) {
                  <div class="upload-zone-modal" [class.drag-over]="isModalDragOver()" (dragover)="onModalDragOver($event)" (dragleave)="isModalDragOver.set(false)" (drop)="onModalDrop($event)">
                    <i class="bi bi-cloud-upload"></i>
                    <p>اسحب الملف هنا أو اضغط للتحميل</p>
                    <small>PDF, DOCX, XLSX, JPG, PNG (حتى 10 ميجابايت)</small>
                    @if (uploadedFileName()) { <div class="uploaded-file"><i class="bi bi-check-circle-fill"></i> {{ uploadedFileName() }}</div> }
                  </div>
                }
              </div>
              <div class="modal-footer">
                <button class="dga-btn outline" (click)="closeModal()">إلغاء</button>
                <button class="dga-btn primary" (click)="submit()" [disabled]="!f.title">
                  <i class="bi" [class]="showEdit() ? 'bi-check-lg' : 'bi-upload'"></i> {{ showEdit() ? 'حفظ التعديلات' : 'رفع المستند' }}
                </button>
              </div>
            </div>
          </div>
        }

        <!-- DELETE CONFIRM -->
        @if (showDeleteConfirm()) {
          <div class="tmk-overlay" (click)="showDeleteConfirm.set(false)">
            <div class="confirm-modal" (click)="$event.stopPropagation()">
              <div class="confirm-icon danger"><i class="bi bi-trash3"></i></div>
              <h3>حذف المستند</h3>
              <p>هل أنت متأكد من حذف "{{ deleteTarget()?.title }}"؟<br>لا يمكن التراجع عن هذا الإجراء.</p>
              <div class="confirm-btns">
                <button class="dga-btn outline" (click)="showDeleteConfirm.set(false)">إلغاء</button>
                <button class="dga-btn danger" (click)="executeDelete()"><i class="bi bi-trash3"></i> حذف نهائي</button>
              </div>
            </div>
          </div>
        }
      </div>
    </app-dashboard-layout>
  `,
  styles: [`
    .page { max-width: 1400px; margin: 0 auto; }
    .dga-breadcrumb { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; color: var(--text-secondary, #6b7280); margin-bottom: 0.5rem; }
    .dga-breadcrumb a { color: var(--text-secondary, #6b7280); text-decoration: none; } .dga-breadcrumb a:hover { text-decoration: underline; } .dga-breadcrumb .sep { opacity: 0.5; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
    .page-header h1 { font-size: 1.5rem; font-weight: 800; margin: 0; }
    .page-header p { color: var(--text-secondary, #6b7280); margin: 0.25rem 0 0; font-size: 0.9rem; }
    .doc-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 1.5rem; }
    @media (max-width: 900px) { .doc-stats { grid-template-columns: repeat(2, 1fr); } }
    .stat-card { display: flex; align-items: center; gap: 0.75rem; padding: 1rem 1.25rem; background: var(--card-bg, #fff); border: 1px solid rgba(0,0,0,0.06); border-radius: 12px; }
    .stat-icon { width: 2.5rem; height: 2.5rem; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
    .stat-icon i { font-size: 1.1rem; color: var(--tmk-primary, #1B8354); }
    .stat-card strong { font-size: 1.35rem; font-weight: 800; display: block; } .stat-card small { font-size: 0.8rem; color: var(--text-secondary, #6b7280); }
    .cat-filter { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1rem; }
    .cat-filter button { padding: 0.4rem 0.85rem; border-radius: 20px; border: 1px solid rgba(0,0,0,0.08); background: transparent; cursor: pointer; font-family: inherit; font-size: 0.8rem; transition: all 0.2s; display: flex; align-items: center; gap: 0.3rem; color: var(--text-secondary, #6b7280); }
    .cat-filter button:hover { border-color: var(--tmk-primary, #1B8354); color: var(--tmk-primary, #1B8354); }
    .cat-filter button.active { background: var(--tmk-primary, #1B8354); color: white; border-color: var(--tmk-primary, #1B8354); }
    .toolbar { display: flex; gap: 1rem; align-items: center; margin-bottom: 1rem; }
    .search-box { position: relative; flex: 1; max-width: 400px; }
    .search-box i { position: absolute; right: 0.75rem; top: 50%; transform: translateY(-50%); color: var(--text-secondary, #6b7280); font-size: 0.85rem; }
    .search-box input { padding-right: 2.25rem; }
    .view-toggle { display: flex; border: 1px solid rgba(0,0,0,0.1); border-radius: 8px; overflow: hidden; }
    .view-toggle button { padding: 0.5rem 0.75rem; background: var(--card-bg, #fff); border: none; cursor: pointer; color: var(--text-secondary, #6b7280); font-size: 1rem; }
    .view-toggle button.active { background: var(--tmk-primary, #1B8354); color: white; }
    .drop-zone { border: 2px dashed rgba(27,131,84,0.25); border-radius: 12px; padding: 1.5rem; text-align: center; background: rgba(27,131,84,0.02); cursor: pointer; margin-bottom: 1.5rem; transition: all 0.3s; }
    .drop-zone:hover { border-color: var(--tmk-primary, #1B8354); background: rgba(27,131,84,0.05); }
    .drop-zone.drag-over { border-color: var(--tmk-primary, #1B8354); background: rgba(27,131,84,0.08); transform: scale(1.01); }
    .dz-content { pointer-events: none; } .dz-icon { font-size: 2rem; color: var(--tmk-primary, #1B8354); margin-bottom: 0.25rem; }
    .dz-content p { margin: 0; font-size: 0.9rem; font-weight: 600; } .dz-content small { color: var(--text-secondary, #6b7280); font-size: 0.8rem; }
    .docs-grid { display: flex; flex-direction: column; gap: 0.75rem; }
    .doc-card { display: flex; align-items: center; gap: 1rem; padding: 1rem 1.25rem; background: var(--card-bg, #fff); border: 1px solid rgba(0,0,0,0.06); border-radius: 12px; transition: all 0.2s; cursor: pointer; }
    .doc-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.06); border-color: rgba(27,131,84,0.15); }
    .doc-card.selected { border-color: var(--tmk-primary, #1B8354); background: rgba(27,131,84,0.02); }
    .dc-icon-wrap { width: 3rem; height: 3rem; border-radius: 10px; background: rgba(27,131,84,0.08); display: flex; flex-direction: column; align-items: center; justify-content: center; flex-shrink: 0; }
    .dc-icon-wrap i { font-size: 1.1rem; color: var(--tmk-primary, #1B8354); }
    .dc-ext { font-size: 0.55rem; font-weight: 700; color: var(--tmk-primary, #1B8354); text-transform: uppercase; margin-top: 1px; }
    .dc-body { flex: 1; min-width: 0; } .dc-title { font-size: 0.95rem; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .dc-meta { font-size: 0.8rem; color: var(--text-secondary, #6b7280); display: block; margin-top: 0.15rem; }
    .dc-links { display: flex; gap: 0.75rem; margin-top: 0.35rem; }
    .dc-link { font-size: 0.8rem; color: var(--tmk-primary, #1B8354); text-decoration: none; display: flex; align-items: center; gap: 0.2rem; } .dc-link:hover { text-decoration: underline; }
    .dc-actions { display: flex; flex-direction: column; align-items: flex-end; gap: 0.5rem; flex-shrink: 0; }
    .dc-cat { font-size: 0.75rem; padding: 0.15rem 0.5rem; border-radius: 8px; background: rgba(27,131,84,0.06); color: var(--tmk-primary, #1B8354); display: flex; align-items: center; gap: 0.25rem; white-space: nowrap; }
    .dc-btns { display: flex; gap: 0.25rem; }
    .icon-btn { width: 1.75rem; height: 1.75rem; border-radius: 6px; border: 1px solid rgba(0,0,0,0.08); background: transparent; cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--text-secondary, #6b7280); font-size: 0.8rem; transition: all 0.2s; }
    .icon-btn:hover { border-color: var(--tmk-primary, #1B8354); color: var(--tmk-primary, #1B8354); background: rgba(27,131,84,0.05); }
    .icon-btn.danger:hover { border-color: #ef4444; color: #ef4444; background: rgba(239,68,68,0.05); }
    .empty-state { text-align: center; padding: 3rem; }
    .empty-state i { font-size: 3rem; display: block; margin-bottom: 0.5rem; opacity: 0.3; } .empty-state p { color: var(--text-secondary, #6b7280); margin: 0 0 0.25rem; } .empty-state small { color: var(--text-muted, #9da4ae); }
    .table-wrap { overflow-x: auto; }
    .dga-table { width: 100%; border-collapse: collapse; background: var(--card-bg, #fff); border-radius: 12px; overflow: hidden; border: 1px solid rgba(0,0,0,0.06); }
    .dga-table th { padding: 0.75rem 1rem; text-align: right; font-size: 0.8rem; font-weight: 600; color: var(--text-secondary, #6b7280); background: rgba(27,131,84,0.03); border-bottom: 1px solid rgba(0,0,0,0.06); }
    .dga-table td { padding: 0.75rem 1rem; border-bottom: 1px solid rgba(0,0,0,0.04); font-size: 0.9rem; } .dga-table tr:hover { background: rgba(27,131,84,0.02); }
    .td-doc { display: flex; align-items: center; gap: 0.5rem; } .td-doc i { font-size: 1.2rem; color: var(--tmk-primary, #1B8354); }
    .td-doc strong { display: block; font-size: 0.9rem; } .td-doc small { font-size: 0.75rem; color: var(--text-secondary, #6b7280); }
    .cat-tag { font-size: 0.75rem; padding: 0.15rem 0.5rem; border-radius: 8px; background: rgba(27,131,84,0.06); display: inline-flex; align-items: center; gap: 0.25rem; }
    .table-link { color: var(--tmk-primary, #1B8354); text-decoration: none; font-size: 0.85rem; } .table-link:hover { text-decoration: underline; }
    .muted { color: var(--text-secondary, #6b7280); } .mono { font-family: 'IBM Plex Mono', monospace; font-size: 0.8rem; }
    .empty-td { text-align: center; padding: 2rem !important; color: var(--text-secondary, #6b7280); }
    .tmk-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); z-index: 2000; display: flex; align-items: center; justify-content: center; }
    .tmk-modal { background: var(--card-bg, #fff); border-radius: 16px; width: 90%; max-width: 600px; max-height: 90vh; overflow-y: auto; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 1.5rem; border-bottom: 1px solid rgba(0,0,0,0.08); }
    .modal-header h3 { font-size: 1.1rem; font-weight: 700; margin: 0; display: flex; align-items: center; gap: 0.5rem; } .modal-header h3 i { color: var(--tmk-primary, #1B8354); }
    .modal-close { background: none; border: none; cursor: pointer; color: var(--text-secondary, #6b7280); font-size: 1rem; }
    .modal-body { padding: 1.5rem; }
    .modal-footer { display: flex; justify-content: flex-end; gap: 0.75rem; padding: 1rem 1.5rem; border-top: 1px solid rgba(0,0,0,0.08); }
    .form-group { margin-bottom: 1rem; } .form-group label { display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.35rem; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; } .req { color: #ef4444; }
    .dga-input, .dga-select, .dga-textarea { width: 100%; padding: 0.6rem 0.8rem; border: 1px solid rgba(0,0,0,0.15); border-radius: 8px; font-family: inherit; font-size: 0.9rem; box-sizing: border-box; background: var(--card-bg, #fff); color: var(--text-primary); }
    .dga-input:focus, .dga-select:focus, .dga-textarea:focus { outline: none; border-color: var(--tmk-primary, #1B8354); box-shadow: 0 0 0 3px rgba(27,131,84,0.1); }
    .dga-btn { padding: 0.55rem 1.25rem; border-radius: 8px; border: none; font-family: inherit; font-size: 0.85rem; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 0.4rem; transition: all 0.2s; }
    .dga-btn.primary { background: var(--tmk-primary, #1B8354); color: white; } .dga-btn.primary:hover { background: var(--tmk-primary-dark, #166A45); } .dga-btn.primary:disabled { opacity: 0.5; }
    .dga-btn.outline { background: transparent; border: 1px solid rgba(0,0,0,0.12); } .dga-btn.danger { background: #ef4444; color: white; }
    .upload-zone-modal { border: 2px dashed rgba(27,131,84,0.3); border-radius: 12px; padding: 2rem; text-align: center; background: rgba(27,131,84,0.02); cursor: pointer; transition: all 0.3s; }
    .upload-zone-modal.drag-over { border-color: var(--tmk-primary, #1B8354); background: rgba(27,131,84,0.08); }
    .upload-zone-modal i { font-size: 2rem; color: var(--tmk-primary, #1B8354); display: block; margin-bottom: 0.5rem; }
    .upload-zone-modal p { margin: 0; font-size: 0.9rem; font-weight: 600; } .upload-zone-modal small { color: var(--text-secondary, #6b7280); }
    .uploaded-file { margin-top: 0.75rem; padding: 0.5rem 0.75rem; background: rgba(27,131,84,0.08); border-radius: 8px; display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.85rem; color: var(--tmk-primary, #1B8354); font-weight: 600; }
    .confirm-modal { background: var(--card-bg, #fff); border-radius: 16px; width: 90%; max-width: 400px; padding: 2.5rem 2rem; text-align: center; }
    .confirm-icon { width: 4rem; height: 4rem; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.75rem; margin: 0 auto 1.25rem; }
    .confirm-icon.danger { background: rgba(239,68,68,0.1); color: #ef4444; }
    .confirm-modal h3 { font-size: 1.2rem; font-weight: 700; margin: 0 0 0.5rem; }
    .confirm-modal p { font-size: 0.9rem; color: var(--text-secondary, #6b7280); line-height: 1.7; margin: 0 0 1.5rem; }
    .confirm-btns { display: flex; justify-content: center; gap: 0.75rem; }
    :host-context([data-theme="dark"]) {
      .doc-card, .stat-card { background: var(--card-bg); border-color: var(--border-light, #384250); }
      .dga-table { background: var(--card-bg); border-color: var(--border-light, #384250); }
      .dga-table th { background: rgba(255,255,255,0.03); border-color: var(--border-light, #384250); }
      .dga-table td { border-color: var(--border-light, #384250); }
      .dga-input, .dga-select, .dga-textarea { background: var(--card-bg); color: var(--text-primary); border-color: var(--border-light, #384250); }
      .tmk-modal, .confirm-modal { background: var(--card-bg); }
      .modal-header, .modal-footer { border-color: var(--border-light, #384250); }
      .drop-zone { border-color: var(--border-light, #384250); background: rgba(27,131,84,0.03); }
      .view-toggle button { background: var(--card-bg); border-color: var(--border-light, #384250); }
      .cat-filter button { border-color: var(--border-light, #384250); }
    }
  `]
})
export class DocumentsComponent {
  store = inject(StoreService);
  categories = DOC_CATEGORIES;
  uniqueCategories = DOC_CATEGORIES.filter((c, i, a) => a.findIndex(x => x.label === c.label) === i);

  searchQuery = signal('');
  filterCat = signal('');
  viewMode = signal<'grid' | 'list'>('grid');
  selectedDoc = signal('');
  showAdd = signal(false);
  showEdit = signal(false);
  showDeleteConfirm = signal(false);
  isDragOver = signal(false);
  isModalDragOver = signal(false);
  uploadedFileName = signal('');
  deleteTarget = signal<any>(null);
  f = { id: '', title: '', category: 'other', type: 'pdf', caseId: '', clientId: '', notes: '' };

  docStats = computed(() => {
    const docs = this.store.documents();
    return [
      { label: 'إجمالي المستندات', count: docs.length, icon: 'bi-files', bg: 'rgba(27,131,84,0.08)' },
      { label: 'لوائح وأحكام', count: docs.filter(d => d.category === 'pleadings' || d.category === 'judgments').length, icon: 'bi-bank', bg: 'rgba(59,130,246,0.08)' },
      { label: 'عقود ووكالات', count: docs.filter(d => d.category === 'contracts' || d.category === 'agencies').length, icon: 'bi-file-earmark-text', bg: 'rgba(245,158,11,0.08)' },
      { label: 'مرتبط بقضايا', count: docs.filter(d => d.caseId).length, icon: 'bi-briefcase', bg: 'rgba(139,92,246,0.08)' },
    ];
  });

  filtered = computed(() => {
    let docs = this.store.documents();
    const cat = this.filterCat();
    const q = this.searchQuery().toLowerCase();
    if (cat) docs = docs.filter(d => d.category === cat);
    if (q) docs = docs.filter(d => d.title.toLowerCase().includes(q));
    return docs;
  });

  getFileIconClass(t?: string) { return { pdf: 'bi-file-earmark-pdf', docx: 'bi-file-earmark-word', xlsx: 'bi-file-earmark-spreadsheet', jpg: 'bi-file-earmark-image', png: 'bi-file-earmark-image', image: 'bi-file-earmark-image' }[t || ''] || 'bi-file-earmark'; }
  getCaseTitle(id: string) { return this.store.getCase(id)?.title || '—'; }
  getCatLabel(id: string) { return this.categories.find(c => c.id === id)?.label || 'أخرى'; }
  getCatIcon(id: string) { return this.categories.find(c => c.id === id)?.icon || 'bi-file-earmark'; }
  formatFileSize(bytes: any) { if (!bytes || bytes === '—') return '—'; const b = Number(bytes); if (isNaN(b) || b === 0) return '—'; if (b < 1024) return b + ' B'; if (b < 1048576) return (b / 1024).toFixed(1) + ' KB'; return (b / 1048576).toFixed(1) + ' MB'; }

  onDragOver(e: DragEvent) { e.preventDefault(); this.isDragOver.set(true); }
  onDragLeave(e: DragEvent) { e.preventDefault(); this.isDragOver.set(false); }
  onDrop(e: DragEvent) {
    e.preventDefault(); this.isDragOver.set(false);
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      this.f.title = files[0].name.replace(/\.[^/.]+$/, '');
      this.f.type = this.detectType(files[0].name);
      this.uploadedFileName.set(files[0].name);
      this.showAdd.set(true);
    }
  }
  onModalDragOver(e: DragEvent) { e.preventDefault(); this.isModalDragOver.set(true); }
  onModalDrop(e: DragEvent) {
    e.preventDefault(); this.isModalDragOver.set(false);
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      if (!this.f.title) this.f.title = files[0].name.replace(/\.[^/.]+$/, '');
      this.f.type = this.detectType(files[0].name);
      this.uploadedFileName.set(files[0].name);
    }
  }
  detectType(name: string): string { const ext = name.split('.').pop()?.toLowerCase() || ''; return { pdf: 'pdf', docx: 'docx', doc: 'docx', xlsx: 'xlsx', xls: 'xlsx', jpg: 'jpg', jpeg: 'jpg', png: 'png' }[ext] || 'other'; }

  editDoc(doc: any) {
    this.f = { id: doc.id, title: doc.title, category: doc.category || 'other', type: doc.type || 'pdf', caseId: doc.caseId || '', clientId: doc.clientId || '', notes: '' };
    this.showEdit.set(true);
  }
  confirmDelete(doc: any) { this.deleteTarget.set(doc); this.showDeleteConfirm.set(true); }
  executeDelete() { if (this.deleteTarget()) this.store.deleteDocument(this.deleteTarget().id); this.showDeleteConfirm.set(false); this.deleteTarget.set(null); }

  closeModal() { this.showAdd.set(false); this.showEdit.set(false); this.uploadedFileName.set(''); this.f = { id: '', title: '', category: 'other', type: 'pdf', caseId: '', clientId: '', notes: '' }; }

  submit() {
    if (!this.f.title) return;
    if (this.showEdit()) {
      const existing = this.store.documents().find(d => d.id === this.f.id);
      if (existing) {
        this.store.deleteDocument(this.f.id);
        this.store.addDocument({ ...existing, title: this.f.title, category: this.f.category, type: this.f.type, caseId: this.f.caseId || undefined, clientId: this.f.clientId || undefined, updatedAt: new Date().toISOString() } as any);
      }
    } else {
      this.store.addDocument({
        id: this.store.generateId('DOC'), title: this.f.title, category: this.f.category, type: this.f.type,
        fileName: this.uploadedFileName() || this.f.title, fileSize: Math.floor(Math.random() * 5000000) + 50000,
        caseId: this.f.caseId || undefined, clientId: this.f.clientId || undefined,
        uploadDate: new Date().toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      } as any);
    }
    this.closeModal();
  }
}
