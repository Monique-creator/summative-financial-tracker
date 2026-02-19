// state.js — central app state
import { loadRecords, saveRecords, loadSettings, saveSettings } from './storage.js';

const DEFAULT_SETTINGS = {
  categories: ['Food', 'Books', 'Transport', 'Entertainment', 'Fees', 'Other'],
  budgetCap: null,
  rateEUR: 0.92,
  rateGBP: 0.79,
};

let _records  = [];
let _settings = {};

export function init() {
  _records  = loadRecords();
  _settings = { ...DEFAULT_SETTINGS, ...loadSettings() };
}

// Records
export function getRecords()         { return [..._records]; }
export function setRecords(arr)      { _records = arr; saveRecords(_records); }
export function addRecord(rec)       { _records.push(rec); saveRecords(_records); }
export function deleteRecord(id)     { _records = _records.filter(r => r.id !== id); saveRecords(_records); }
export function updateRecord(updated) {
  _records = _records.map(r => r.id === updated.id ? updated : r);
  saveRecords(_records);
}
export function findRecord(id)       { return _records.find(r => r.id === id); }

// Settings
export function getSettings()        { return { ..._settings }; }
export function patchSettings(patch) {
  _settings = { ..._settings, ...patch };
  saveSettings(_settings);
}

// ID generator
let _seq = Date.now();
export function genId() { return `txn_${(++_seq).toString(36)}`; }
