let idCounter = 1;
export function nextId(prefix = 'id') {
  const n = idCounter++;
  return `${prefix}_${n.toString().padStart(6, '0')}`;
}

export function resetIdCounter() {
  idCounter = 1;
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function dateMinusDaysISO(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export function datePlusDaysISO(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function nowISO() {
  return new Date().toISOString();
}