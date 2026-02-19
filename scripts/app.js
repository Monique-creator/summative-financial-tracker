// app.js — main controller 

import * as State    from './state.js';
import * as UI       from './ui.js';
import * as V        from './validators.js';
import { compileRegex, recordMatches } from './search.js';
import { loadRecords } from './storage.js';

// Initialization 
document.addEventListener('DOMContentLoaded', () => {
  State.init();
  UI.populateCategorySelects();
  loadSettingsIntoUI();
  setupNav();
  setupForm();
  setupRecordsPage();
  setupSettings();
  setupModal();
  setupConverter();

  document.getElementById('footer-year').textContent = new Date().getFullYear();

  UI.showPage('dashboard');
  UI.renderDashboard(State.getRecords());
  refreshRecordsPage();
});

// Navigation 
function setupNav() {
  document.addEventListener('click', e => {
    const link = e.target.closest('[data-page]');
    if (!link) return;
    e.preventDefault();
    const page = link.dataset.page;
    if (page === 'add') { resetAddForm(); }
    UI.showPage(page);
    if (page === 'dashboard') UI.renderDashboard(State.getRecords());
    if (page === 'records')   refreshRecordsPage();
  });

  // Hamburger toggle
  const toggle = document.querySelector('.nav-toggle');
  const nav    = document.getElementById('main-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }
}

// ── Adding / Editing Form 
function resetAddForm() {
  const form = document.getElementById('txn-form');
  form.reset();
  document.getElementById('edit-id').value = '';
  document.getElementById('h-add').textContent = 'Add Transaction';
  document.getElementById('btn-submit').textContent = 'Save Transaction';
  clearFieldErrors(['f-desc','f-amount','f-date','f-category','f-notes']);
  document.getElementById('f-date').value = new Date().toISOString().slice(0,10);
  UI.populateCategorySelects();
}

function setupForm() {
  // Set today as default date
  document.getElementById('f-date').value = new Date().toISOString().slice(0,10);

  document.getElementById('txn-form').addEventListener('submit', e => {
    e.preventDefault();
    const desc  = document.getElementById('f-desc').value;
    const amt   = document.getElementById('f-amount').value;
    const date  = document.getElementById('f-date').value;
    const cat   = document.getElementById('f-category').value;
    const notes = document.getElementById('f-notes').value;

    const errors = {
      'f-desc-err':   V.validateDescription(desc),
      'f-amount-err': V.validateAmount(amt),
      'f-date-err':   V.validateDate(date),
      'f-cat-err':    V.validateCategory(cat),
      'f-notes-err':  V.validateNotes(notes),
    };

    // Mark invalid inputs
    setFieldErrors(errors, {
      'f-desc-err':'f-desc', 'f-amount-err':'f-amount',
      'f-date-err':'f-date', 'f-cat-err':'f-category', 'f-notes-err':'f-notes'
    });

    if (Object.values(errors).some(Boolean)) return;

    const editId = document.getElementById('edit-id').value;
    const now    = new Date().toISOString();

    if (editId) {
      const existing = State.findRecord(editId);
      State.updateRecord({ ...existing, description: desc.trim(), amount: parseFloat(amt), date, category: cat, notes: notes.trim(), updatedAt: now });
      UI.announce(`Transaction "${desc}" updated.`);
    } else {
      State.addRecord({
        id: State.genId(), description: desc.trim(), amount: parseFloat(amt),
        category: cat, date, notes: notes.trim(), createdAt: now, updatedAt: now
      });
      UI.announce(`Transaction "${desc}" added.`);
    }

    UI.showPage('records');
    refreshRecordsPage();
  });

  document.getElementById('btn-cancel').addEventListener('click', () => {
    UI.showPage('records'); refreshRecordsPage();
  });
}

// Records page 
let currentRegex = null;

function setupRecordsPage() {
  const searchInput = document.getElementById('search-input');
  const caseToggle  = document.getElementById('search-case');
  const sortSelect  = document.getElementById('sort-select');
  const searchError = document.getElementById('search-error');

  function doSearch() {
    const pattern   = searchInput.value.trim();
    const sensitive = caseToggle.checked;
    if (!pattern) {
      currentRegex = null;
      searchError.hidden = true;
      refreshRecordsPage();
      return;
    }
    const result = compileRegex(pattern, sensitive);
    if (result === undefined) {
      searchError.textContent = 'Invalid regex pattern.';
      searchError.hidden = false;
      currentRegex = null;
    } else {
      searchError.hidden = true;
      currentRegex = result;
    }
    refreshRecordsPage();
  }

  searchInput.addEventListener('input', doSearch);
  caseToggle.addEventListener('change', doSearch);
  sortSelect.addEventListener('change', () => refreshRecordsPage());

  // Export
  document.getElementById('btn-export').addEventListener('click', () => {
    const data = State.getRecords();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), { href: url, download: 'studentspend-export.json' });
    a.click(); URL.revokeObjectURL(url);
    UI.announce('Records exported as JSON.');
  });

  // Importing file
  document.getElementById('import-file').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const parsed = JSON.parse(ev.target.result);
        if (!Array.isArray(parsed)) throw new Error('Expected an array.');
        const valid = parsed.filter(V.validateRecord);
        if (!valid.length) throw new Error('No valid records found.');
        // Merging by skiping duplicates by id
        const existing = State.getRecords();
        const existIds = new Set(existing.map(r => r.id));
        const fresh = valid.filter(r => !existIds.has(r.id));
        State.setRecords([...existing, ...fresh]);
        refreshRecordsPage();
        UI.renderDashboard(State.getRecords());
        UI.announce(`Imported ${fresh.length} new record(s). Skipped ${valid.length - fresh.length} duplicates.`);
      } catch (err) {
        UI.announce(`Import failed: ${err.message}`, 'assertive');
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  });
}

function refreshRecordsPage() {
  const sortVal = document.getElementById('sort-select')?.value || 'date-desc';
  let records = State.getRecords();
  if (currentRegex) records = records.filter(r => recordMatches(r, currentRegex));
  records = UI.sortRecords(records, sortVal);
  UI.renderTable(records, currentRegex, openEditModal, handleDelete);
}

function handleDelete(id) {
  const rec = State.findRecord(id);
  if (!rec) return;
  if (!confirm(`Delete "${rec.description}"?`)) return;
  State.deleteRecord(id);
  refreshRecordsPage();
  UI.renderDashboard(State.getRecords());
  UI.announce(`Deleted "${rec.description}".`);
}

// Edit Modal 
function setupModal() {
  const modal  = document.getElementById('edit-modal');
  const form   = document.getElementById('edit-form');
  const close  = () => { modal.hidden = true; };

  document.getElementById('btn-modal-cancel').addEventListener('click', close);
  document.getElementById('modal-close').addEventListener('click', close);
  modal.addEventListener('click', e => { if (e.target === modal) close(); });

  // Trap focus inside modal
  modal.addEventListener('keydown', e => {
    if (e.key === 'Escape') close();
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    const id    = document.getElementById('m-id').value;
    const desc  = document.getElementById('m-desc').value;
    const amt   = document.getElementById('m-amount').value;
    const date  = document.getElementById('m-date').value;
    const cat   = document.getElementById('m-category').value;
    const notes = document.getElementById('m-notes').value;

    const errors = {
      'm-desc-err':   V.validateDescription(desc),
      'm-amount-err': V.validateAmount(amt),
    };
    setFieldErrors(errors, { 'm-desc-err':'m-desc', 'm-amount-err':'m-amount' });
    if (Object.values(errors).some(Boolean)) return;

    const existing = State.findRecord(id);
    State.updateRecord({ ...existing, description: desc.trim(), amount: parseFloat(amt), date, category: cat, notes: notes.trim(), updatedAt: new Date().toISOString() });

    close();
    refreshRecordsPage();
    UI.renderDashboard(State.getRecords());
    UI.announce(`Updated "${desc}".`);
  });
}

function openEditModal(id) {
  const rec   = State.findRecord(id);
  if (!rec) return;
  UI.populateCategorySelects();
  document.getElementById('m-id').value       = rec.id;
  document.getElementById('m-desc').value     = rec.description;
  document.getElementById('m-amount').value   = rec.amount;
  document.getElementById('m-date').value     = rec.date;
  document.getElementById('m-category').value = rec.category;
  document.getElementById('m-notes').value    = rec.notes || '';
  clearFieldErrors(['m-desc','m-amount']);
  const modal = document.getElementById('edit-modal');
  modal.hidden = false;
  // Focus first input
  document.getElementById('m-desc').focus();
}

// Settings 
function loadSettingsIntoUI() {
  const s = State.getSettings();
  document.getElementById('s-cap').value   = s.budgetCap || '';
  document.getElementById('s-eur').value   = s.rateEUR || '';
  document.getElementById('s-gbp').value   = s.rateGBP || '';
  document.getElementById('s-cats').value  = s.categories.join(', ');
  updateRatesDisplay();
}

function updateRatesDisplay() {
  const s = State.getSettings();
  const d = document.getElementById('rates-display');
  if (d) d.textContent = `1 USD = ${s.rateEUR} EUR | 1 USD = ${s.rateGBP} GBP`;
}

function setupSettings() {
  // Budget cap
  document.getElementById('btn-save-cap').addEventListener('click', () => {
    const val = document.getElementById('s-cap').value.trim();
    const err = document.getElementById('s-cap-err');
    if (val && !/^(0|[1-9]\d*)(\.\d{1,2})?$/.test(val)) {
      err.textContent = 'Enter a valid amount.'; return;
    }
    err.textContent = '';
    State.patchSettings({ budgetCap: val ? parseFloat(val) : null });
    UI.renderDashboard(State.getRecords());
    UI.announce('Budget cap saved.');
  });

  // Currency rates and converting
  document.getElementById('btn-save-rates').addEventListener('click', () => {
    const eur = parseFloat(document.getElementById('s-eur').value) || 0.92;
    const gbp = parseFloat(document.getElementById('s-gbp').value) || 0.79;
    State.patchSettings({ rateEUR: eur, rateGBP: gbp });
    updateRatesDisplay();
    UI.announce('Currency rates saved.');
  });

  // Categories
  document.getElementById('btn-save-cats').addEventListener('click', () => {
    const raw = document.getElementById('s-cats').value;
    const err = document.getElementById('s-cats-err');
    const cats = raw.split(',').map(c => c.trim()).filter(Boolean);
    const invalid = cats.filter(c => !V.validateCategoryName(c));
    if (invalid.length) {
      err.textContent = `Invalid: ${invalid.join(', ')}. Letters, spaces, hyphens only.`;
      return;
    }
    err.textContent = '';
    State.patchSettings({ categories: cats });
    UI.populateCategorySelects();
    UI.announce('Categories updated.');
  });

  // Clearing all data option
  document.getElementById('btn-clear-all').addEventListener('click', () => {
    if (!confirm('Clear ALL data? This cannot be undone.')) return;
    import('./storage.js').then(({ clearAll }) => {
      clearAll();
      State.init();
      UI.populateCategorySelects();
      loadSettingsIntoUI();
      refreshRecordsPage();
      UI.renderDashboard(State.getRecords());
      UI.announce('All data cleared.');
    });
  });
}

// Currency Converter 
function setupConverter() {
  const toggle = document.getElementById('converter-toggle');
  const panel  = document.getElementById('converter-panel');
  const input  = document.getElementById('cv-usd');
  const results= document.getElementById('cv-results');

  toggle.addEventListener('click', () => {
    const open = !panel.hidden;
    panel.hidden = open;
    toggle.setAttribute('aria-expanded', open ? 'false' : 'true');
    if (!open) input.focus();
  });

  input.addEventListener('input', () => {
    const val = parseFloat(input.value);
    if (isNaN(val) || val < 0) { results.textContent = ''; return; }
    const { rateEUR, rateGBP } = State.getSettings();
    results.innerHTML = `<div>EUR: €${(val * rateEUR).toFixed(2)}</div><div>GBP: £${(val * rateGBP).toFixed(2)}</div>`;
  });
}

// Helpers 
function setFieldErrors(errors, inputMap) {
  Object.entries(errors).forEach(([errId, msg]) => {
    const errEl   = document.getElementById(errId);
    const inputId = inputMap[errId];
    const inputEl = inputId ? document.getElementById(inputId) : null;
    if (errEl)   errEl.textContent = msg;
    if (inputEl) inputEl.classList.toggle('invalid', !!msg);
  });
}

function clearFieldErrors(inputIds) {
  inputIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('invalid');
  });
  // Clearing error spans
  ['f-desc-err','f-amount-err','f-date-err','f-cat-err','f-notes-err',
   'm-desc-err','m-amount-err'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = '';
  });
}
