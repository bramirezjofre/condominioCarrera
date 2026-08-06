import { findById, listWhere, getCollection } from './demo-store.js';
import { ROLES } from './roles.js';

const payments = () => getCollection('payments');
const fines = () => getCollection('fines');
const parcels = () => getCollection('parcels');
const reservations = () => getCollection('reservations');
const maintenance = () => getCollection('maintenance');
const charges = () => getCollection('charges');
const people = () => getCollection('people');

export function authorizedTowerIds(user) {
  if (!user) return [];
  if (user.isCondominiumAdmin) {
    return listWhere('towers', (t) => t.condominiumId === user.condominiumId).map((t) => t.id);
  }
  return user.towerIds ?? [];
}

export function authorizedUnitIds(user) {
  if (!user) return [];
  const towers = authorizedTowerIds(user);
  return listWhere('units', (u) => towers.includes(u.towerId)).map((u) => u.id);
}

export function userCanAccessTower(user, towerId) {
  if (!user) return false;
  if (user.isCondominiumAdmin) return true;
  return (user.towerIds ?? []).includes(towerId);
}

export function userCanAccessUnit(user, unitId) {
  if (!user) return false;
  const unit = findById('units', unitId);
  if (!unit) return false;
  return userCanAccessTower(user, unit.towerId);
}

export function userCanAccessCondominium(user, condominiumId) {
  if (!user) return false;
  return user.condominiumId === condominiumId;
}

export function filterTowersForUser(user) {
  if (!user) return [];
  if (user.isCondominiumAdmin) {
    return listWhere('towers', (t) => t.condominiumId === user.condominiumId);
  }
  return listWhere('towers', (t) => (user.towerIds ?? []).includes(t.id));
}

export function filterUnitsForUser(user) {
  if (!user) return [];
  const towers = filterTowersForUser(user);
  const ids = new Set(towers.map((t) => t.id));
  return listWhere('units', (u) => ids.has(u.towerId));
}

export function filterPaymentsForUser(user) {
  if (!user) return [];
  const all = payments();
  if (user.isCondominiumAdmin || user.roleCodes?.includes(ROLES.ACCOUNTANT)) return all;
  const unitIds = new Set(authorizedUnitIds(user));
  return all.filter((p) => unitIds.has(p.unitId));
}

export function filterFinesForUser(user) {
  if (!user) return [];
  const all = fines();
  if (user.isCondominiumAdmin) return all;
  const unitIds = new Set(authorizedUnitIds(user));
  return all.filter((f) => unitIds.has(f.unitId));
}

export function filterParcelsForUser(user) {
  if (!user) return [];
  const all = parcels();
  if (user.isCondominiumAdmin) return all;
  const unitIds = new Set(authorizedUnitIds(user));
  return all.filter((p) => unitIds.has(p.unitId));
}

export function filterReservationsForUser(user) {
  if (!user) return [];
  const all = reservations();
  if (user.isCondominiumAdmin) return all;
  const unitIds = new Set(authorizedUnitIds(user));
  return all.filter((r) => unitIds.has(r.unitId));
}

export function filterMaintenanceForUser(user) {
  if (!user) return [];
  const all = maintenance();
  if (user.isCondominiumAdmin) return all;
  const unitIds = new Set(authorizedUnitIds(user));
  return all.filter((m) => unitIds.has(m.unitId));
}

export function filterChargesForUser(user) {
  if (!user) return [];
  const unitIds = new Set(authorizedUnitIds(user));
  return charges().filter((c) => unitIds.has(c.unitId));
}

export function filterPeopleForUser(user) {
  if (!user) return [];
  const all = people();
  if (user.isCondominiumAdmin) return all;
  if (user.roleCodes?.includes(ROLES.RESIDENT)) {
    return all.filter((p) => p.id === user.personId);
  }
  const unitIds = new Set(authorizedUnitIds(user));
  const occupants = new Set();
  for (const occ of listWhere('occupancies', (o) => o.endsOn === null)) {
    if (unitIds.has(occ.unitId)) occupants.add(occ.personId);
  }
  if (user.roleCodes?.includes(ROLES.TOWER_ADMIN) || user.roleCodes?.includes(ROLES.TOWER_TEAM)) {
    return all;
  }
  return all.filter((p) => occupants.has(p.id) || p.id === user.personId);
}

export function requireScopeUser(req, res, next) {
  if (!req.session?.user) return res.redirect('/login');
  next();
}
