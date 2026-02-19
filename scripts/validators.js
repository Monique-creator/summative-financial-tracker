// regex validation rules

// Rule 1: Description – no leading/trailing spaces, no double spaces
const RE_DESC = /^\S(?:.*\S)?$/;

// Rule 2: Amount – non-negative number, up to 2 decimal places
const RE_AMOUNT = /^(0|[1-9]\d*)(\.\d{1,2})?$/;

// Rule 3: Date must be in this format YYYY-MM-DD
const RE_DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

// Rule 4: Category/tag – letters, single spaces or hyphens between words
const RE_CAT = /^[A-Za-z]+(?:[ -][A-Za-z]+)*$/;

// Rule5: Detecting duplicate consecutive words 

export const RE_DUPLICATE_WORD = /\b(\w+)\s+\1\b/i;

export function validateDescription(val) {
  if (!val || val.trim() === '') return 'Description is required.';
  if (!RE_DESC.test(val)) return 'No leading/trailing spaces or consecutive spaces.';
  if (RE_DUPLICATE_WORD.test(val)) return 'Duplicate consecutive words detected.';
  return '';
}

export function validateAmount(val) {
  if (!val || val.trim() === '') return 'Amount is required.';
  if (!RE_AMOUNT.test(val.trim()))   return 'Enter a valid amount (e.g. 12.50).';
  if (parseFloat(val) > 99999)       return 'Amount too large (max $99,999).';
  return '';
}

export function validateDate(val) {
  if (!val) return 'Date is required.';
  if (!RE_DATE.test(val)) return 'Use YYYY-MM-DD format.';
  return '';
}

export function validateCategory(val) {
  if (!val) return 'Please select a category.';
  return '';
}

export function validateNotes(val) {
  if (!val) return '';   // optional
  if (RE_DUPLICATE_WORD.test(val)) return 'Duplicate consecutive words detected.';
  return '';
}

export function validateCategoryName(name) {
  return RE_CAT.test(name.trim());
}

// Validating a full record object (used on JSON import)
export function validateRecord(obj) {
  if (typeof obj !== 'object' || obj === null) return false;
  const { id, description, amount, category, date } = obj;
  if (!id || typeof id !== 'string') return false;
  if (validateDescription(description)) return false;
  if (validateAmount(String(amount)))   return false;
  if (validateDate(date))               return false;
  if (!category)                        return false;
  return true;
}
