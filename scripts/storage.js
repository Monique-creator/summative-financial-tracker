// storage.js — localStorage helpers
const KEY_RECORDS  = 'ss:records';
const KEY_SETTINGS = 'ss:settings';

export function loadRecords() {
  try { return JSON.parse(localStorage.getItem(KEY_RECORDS) || '[]'); }
  catch { return []; }
}

export function saveRecords(records) {
  localStorage.setItem(KEY_RECORDS, JSON.stringify(records));
}

export function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem(KEY_SETTINGS) || '{}');
  } catch { return {}; }
}

export function saveSettings(settings) {
  localStorage.setItem(KEY_SETTINGS, JSON.stringify(settings));
}

export function clearAll() {
  localStorage.removeItem(KEY_RECORDS);
  localStorage.removeItem(KEY_SETTINGS);
}
