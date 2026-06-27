export function safeArray(x) {
  return Array.isArray(x) ? x : [];
}

export function safeString(x) {
  return typeof x === 'string' ? x : String(x || '');
}

export function safeNumber(x) {
  return typeof x === 'number' ? x : parseFloat(x) || 0;
}
