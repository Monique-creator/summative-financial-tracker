// ui.js — DOM rendering helpers

import { highlight } from './search.js';
import { getSettings } from './state.js';

/** Announce message via ARIA live region */
export function announce(msg, type = 'polite') {
  const el = document.getElementById(type === 'assertive' ? 'alert-msg' : 'status-msg');
  if (!el) return;
  el.textContent = '';
  requestAnimationFrame(() => { el.textContent = msg; });
}

/** Navigate to a named page section */
export function showPage(name) {
  document.querySelectorAll('.page').forEach(p => {
    const isTarget = p.id === `page-${name}`;
    p.hidden = !isTarget;
    p.classList.toggle('active', isTarget);
  });
  document.querySelectorAll('.nav-link').forEach(a => {
    a.classList.toggle('active', a.dataset.page === name);
  });
  // Close mobile nav
  const nav = document.getElementById('main-nav');
  const toggle = document.querySelector('.nav-toggle');
  if (nav && toggle) {
    nav.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  }
  // Moving focus to main
  const main = document.getElementById('main-content');
  if (main) main.focus();
}

/** Populate category dropdowns */
export function populateCategorySelects() {
  const { categories } = getSettings();
  ['f-category', 'm-category'].forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    const cur = sel.value;
    sel.innerHTML = '<option value="">— select —</option>';
    categories.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c; opt.textContent = c;
      if (c === cur) opt.selected = true;
      sel.appendChild(opt);
    });
  });
}

/** Sort an array of records */
export function sortRecords(records, sortVal) {
  const arr = [...records];
  switch (sortVal) {
    case 'date-asc':     return arr.sort((a,b) => a.date.localeCompare(b.date));
    case 'date-desc':    return arr.sort((a,b) => b.date.localeCompare(a.date));
    case 'alpha-asc':    return arr.sort((a,b) => a.description.localeCompare(b.description));
    case 'alpha-desc':   return arr.sort((a,b) => b.description.localeCompare(a.description));
    case 'amount-asc':   return arr.sort((a,b) => a.amount - b.amount);
    case 'amount-desc':  return arr.sort((a,b) => b.amount - a.amount);
    default: return arr;
  }
}

/** Render the records table */
export function renderTable(records, re, onEdit, onDelete) {
  const tbody = document.getElementById('records-body');
  const empty = document.getElementById('no-records');
  if (!tbody) return;

  if (records.length === 0) {
    tbody.innerHTML = '';
    if (empty) empty.hidden = false;
    return;
  }
  if (empty) empty.hidden = true;

  tbody.innerHTML = '';
  records.forEach(rec => {
    const tr = document.createElement('tr');

    // Description with highlighted search
    const descHL = highlight(rec.description, re);
    const catHL  = highlight(rec.category, re);
    const amount = `$${parseFloat(rec.amount).toFixed(2)}`;

    tr.innerHTML = `
      <td>${descHL}${rec.notes ? `<br><small style="color:#6b6358;">${highlight(rec.notes, re)}</small>` : ''}</td>
      <td class="amount-cell">${amount}</td>
      <td><span class="cat-badge">${catHL}</span></td>
      <td class="date-cell">${rec.date}</td>
      <td class="actions-cell">
        <button class="btn btn-icon" data-action="edit"   data-id="${rec.id}" aria-label="Edit ${rec.description}">✏️</button>
        <button class="btn btn-icon" data-action="delete" data-id="${rec.id}" aria-label="Delete ${rec.description}">🗑️</button>
      </td>
    `;

    tr.querySelector('[data-action="edit"]').addEventListener('click', () => onEdit(rec.id));
    tr.querySelector('[data-action="delete"]').addEventListener('click', () => onDelete(rec.id));
    tbody.appendChild(tr);
  });
}

/** Render dashboard stats */
export function renderDashboard(records) {
  const { budgetCap } = getSettings();
  const total = records.reduce((s, r) => s + parseFloat(r.amount), 0);

  // Stat cards
  setText('stat-count', records.length);
  setText('stat-total', `$${total.toFixed(2)}`);

  // Top category
  const catTotals = {};
  records.forEach(r => { catTotals[r.category] = (catTotals[r.category] || 0) + parseFloat(r.amount); });
  const topCat = Object.entries(catTotals).sort((a,b) => b[1]-a[1])[0];
  setText('stat-top-cat', topCat ? topCat[0] : '—');

  // Budget cap
  const budgetSection = document.getElementById('budget-section');
  const budgetBar     = document.getElementById('budget-bar');
  const budgetLabel   = document.getElementById('budget-label');
  const statCap       = document.getElementById('stat-cap');
  const progressEl    = document.getElementById('budget-progress');

  if (budgetCap) {
    const pct     = Math.min((total / budgetCap) * 100, 100);
    const over    = total > budgetCap;
    const remain  = budgetCap - total;

    setText('stat-cap', over ? `Over by $${Math.abs(remain).toFixed(2)}` : `$${remain.toFixed(2)} left`);
    budgetSection.hidden = false;
    budgetBar.style.width = pct + '%';
    budgetBar.classList.toggle('over', over);
    progressEl.setAttribute('aria-valuenow', Math.round(pct));
    budgetLabel.textContent = over
      ? `Over budget by $${Math.abs(remain).toFixed(2)} (Cap: $${budgetCap})`
      : `$${remain.toFixed(2)} remaining of $${budgetCap} cap`;

    // ARIA live
    const alertEl  = document.getElementById('alert-msg');
    const statusEl = document.getElementById('status-msg');
    if (over && alertEl) { alertEl.textContent = ''; requestAnimationFrame(() => { alertEl.textContent = `Budget exceeded by $${Math.abs(remain).toFixed(2)}.`; }); }
    else if (statusEl)   { statusEl.textContent = ''; requestAnimationFrame(() => { statusEl.textContent = `$${remain.toFixed(2)} remaining in budget.`; }); }
  } else {
    setText('stat-cap', 'Not set');
    budgetSection.hidden = true;
  }

  // 7-day chart
  renderWeekChart(records);

  // Category breakdown
  renderCatBreakdown(catTotals, total);
}

function renderWeekChart(records) {
  const chart = document.getElementById('week-chart');
  if (!chart) return;
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    days.push({ label: d.toLocaleDateString('en',{weekday:'short'}), date: d.toISOString().slice(0,10), total: 0 });
  }
  records.forEach(r => {
    const d = days.find(d => d.date === r.date);
    if (d) d.total += parseFloat(r.amount);
  });
  const max = Math.max(...days.map(d => d.total), 1);
  chart.innerHTML = '';
  days.forEach(d => {
    const pct = (d.total / max) * 100;
    const col = document.createElement('div');
    col.className = 'bar-col';
    col.innerHTML = `
      <span class="bar-amt">${d.total > 0 ? '$'+d.total.toFixed(0) : ''}</span>
      <div class="bar-fill" style="height:${pct}%" title="${d.date}: $${d.total.toFixed(2)}"></div>
      <span class="bar-day">${d.label}</span>
    `;
    chart.appendChild(col);
  });
}

function renderCatBreakdown(catTotals, grandTotal) {
  const list = document.getElementById('cat-list');
  if (!list) return;
  list.innerHTML = '';
  if (!grandTotal) { list.innerHTML = '<li style="color:#6b6358;font-size:.85rem;">No data yet.</li>'; return; }
  Object.entries(catTotals).sort((a,b) => b[1]-a[1]).forEach(([cat, amt]) => {
    const pct = (amt / grandTotal) * 100;
    const li  = document.createElement('li');
    li.className = 'cat-item';
    li.innerHTML = `
      <span class="cat-name">${cat}</span>
      <div class="cat-bar-wrap"><div class="cat-bar" style="width:${pct}%"></div></div>
      <span class="cat-amount">$${amt.toFixed(2)}</span>
    `;
    list.appendChild(li);
  });
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}
