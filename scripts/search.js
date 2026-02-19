// search.js — safe regex compiler & match highlighter

/**
 * Safely compile a user-supplied regex string.
 * Returns null if empty or invalid.
 */
export function compileRegex(pattern, caseSensitive = false) {
  if (!pattern || pattern.trim() === '') return null;
  try {
    const flags = caseSensitive ? 'g' : 'gi';
    return new RegExp(pattern, flags);
  } catch {
    return undefined; // undefined = invalid (vs null = empty)
  }
}

/**
 * Highlight all matches of `re` inside `text`.
 * Returns safe HTML string with <mark> tags.
 * If re is null/undefined, returns escaped plain text.
 */
export function highlight(text, re) {
  if (typeof text !== 'string') return '';
  // Escape HTML to prevent XSS
  const safe = text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  if (!re) return safe;
  // Reset lastIndex since we use 'g' flag
  re.lastIndex = 0;
  return safe.replace(re, m => `<mark>${m}</mark>`);
}

/**
 * Test whether a record matches the regex.
 * Searches across description, category, notes.
 */
export function recordMatches(record, re) {
  if (!re) return true;
  re.lastIndex = 0;
  const haystack = [record.description, record.category, record.notes || ''].join(' ');
  re.lastIndex = 0;
  return re.test(haystack);
}
