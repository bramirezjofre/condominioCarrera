export function formatCLP(value) {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0
  }).format(n);
}

export function formatDate(value, locale = 'es-CL') {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(d);
}

export function formatDateTime(value, locale = 'es-CL') {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(d);
}