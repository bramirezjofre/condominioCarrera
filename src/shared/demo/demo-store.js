import { buildDemoData } from './demo-data.js';
import { resetIdCounter, nextId as generateId } from './ids.js';

let snapshot = null;

function ensure() {
  if (!snapshot) {
    resetIdCounter();
    snapshot = buildDemoData();
  }
  return snapshot;
}

export function getStore() {
  return ensure();
}

export function resetStore() {
  resetIdCounter();
  snapshot = buildDemoData();
  return snapshot;
}

export function getCollection(name) {
  const store = ensure();
  return store[name] ?? [];
}

export function findById(collection, id) {
  return getCollection(collection).find((row) => row.id === id) ?? null;
}

export function listWhere(collection, predicate) {
  return getCollection(collection).filter(predicate);
}

export function insert(collection, row) {
  const store = ensure();
  store[collection] = [row, ...store[collection]];
  return row;
}

export function update(collection, id, patch) {
  const store = ensure();
  const idx = store[collection].findIndex((row) => row.id === id);
  if (idx === -1) return null;
  store[collection][idx] = { ...store[collection][idx], ...patch };
  return store[collection][idx];
}

export function remove(collection, id) {
  const store = ensure();
  const before = store[collection].length;
  store[collection] = store[collection].filter((row) => row.id !== id);
  return store[collection].length < before;
}

export function nextId(prefix = 'id') {
  return generateId(prefix);
}