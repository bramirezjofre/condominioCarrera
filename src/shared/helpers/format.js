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

export function formatNumber(value) {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat('es-CL').format(n);
}

export function relativeTime(date) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  const diff = (Date.now() - d.getTime()) / 1000;
  const units = [
    { name: 'año', seconds: 365 * 24 * 3600 },
    { name: 'mes', seconds: 30 * 24 * 3600 },
    { name: 'dia', seconds: 24 * 3600 },
    { name: 'hora', seconds: 3600 },
    { name: 'minuto', seconds: 60 }
  ];
  for (const u of units) {
    const v = Math.floor(diff / u.seconds);
    if (v >= 1) {
      return `hace ${v} ${u.name}${v > 1 ? (u.name === 'mes' ? 'es' : 's') : ''}`;
    }
  }
  return 'hace un momento';
}