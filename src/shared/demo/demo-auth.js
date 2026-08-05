import { findById, listWhere } from './demo-store.js';
import { ROLE_PERMISSIONS } from './roles.js';

export function authenticateDemo(identifier, password) {
  const user = findById('users', listMatchingUserId(identifier));
  if (!user) return null;
  if (user.status !== 'active') return null;
  if (user.password !== password) return null;
  return buildSessionUser(user);
}

export function listMatchingUserId(identifier) {
  const users = listWhere('users', () => true);
  const found = users.find(
    (u) => u.username?.toLowerCase() === identifier.toLowerCase() || u.email?.toLowerCase() === identifier.toLowerCase()
  );
  if (found) return found.id;
  return null;
}

export function buildSessionUser(user) {
  const permissions = new Set();
  for (const role of user.roleCodes ?? []) {
    const perms = ROLE_PERMISSIONS[role] ?? [];
    for (const p of perms) permissions.add(p);
  }
  return {
    id: user.id,
    personId: user.personId,
    condominiumId: user.condominiumId,
    email: user.email,
    username: user.username,
    fullName: user.fullName,
    mustChangePassword: user.mustChangePassword,
    isCondominiumAdmin: (user.roleCodes ?? []).includes('condominium_admin'),
    roleCodes: user.roleCodes ?? [],
    towerIds: user.towerIds ?? [],
    unitIds: user.unitIds ?? [],
    permissions: Array.from(permissions)
  };
}

export function sessionsForUser(userId) {
  return listWhere('users', (u) => u.id === userId);
}