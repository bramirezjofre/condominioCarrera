import argon2 from 'argon2';
import {
  findUserByIdentifier,
  getUserContext,
  recordFailedLogin,
  recordSuccessfulLogin,
  createAuditEvent
} from './auth.repository.js';
import { UnauthorizedError, ForbiddenError } from '../../shared/errors/index.js';

const argon2Options = {
  type: argon2.argon2id
};

export async function verifyPassword(hash, plain) {
  return argon2.verify(hash, plain, argon2Options);
}

export async function hashPassword(plain) {
  return argon2.hash(plain, argon2Options);
}

export async function authenticate({ identifier, password, ipAddress, userAgent }) {
  const user = await findUserByIdentifier(identifier);

  if (!user) {
    await createAuditEvent({
      actorUserId: null,
      action: 'auth.login.failed',
      entityType: 'app_user',
      ipAddress,
      userAgent,
      success: false
    });
    throw new UnauthorizedError('Credenciales invalidas');
  }

  if (user.status !== 'active') {
    await createAuditEvent({
      actorUserId: user.id,
      action: 'auth.login.blocked',
      entityType: 'app_user',
      entityId: user.id,
      ipAddress,
      userAgent,
      success: false
    });
    throw new ForbiddenError('Cuenta inactiva o bloqueada');
  }

  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    throw new ForbiddenError('Cuenta bloqueada temporalmente. Intente mas tarde.');
  }

  const ok = await verifyPassword(user.password_hash, password);

  if (!ok) {
    await recordFailedLogin(user.id);
    await createAuditEvent({
      actorUserId: user.id,
      action: 'auth.login.failed',
      entityType: 'app_user',
      entityId: user.id,
      ipAddress,
      userAgent,
      success: false
    });
    throw new UnauthorizedError('Credenciales invalidas');
  }

  await recordSuccessfulLogin(user.id);
  await createAuditEvent({
    actorUserId: user.id,
    action: 'auth.login.success',
    entityType: 'app_user',
    entityId: user.id,
    ipAddress,
    userAgent,
    success: true
  });

  const context = await getUserContext(user.id);

  return {
    id: context.user_id,
    personId: context.person_id,
    email: context.email,
    username: context.username,
    fullName: context.full_name,
    mustChangePassword: context.must_change_password,
    isCondominiumAdmin: context.is_condominium_admin === true,
    roleCodes: context.role_codes ?? [],
    towerIds: context.tower_ids ?? [],
    unitIds: context.unit_ids ?? [],
    permissions: context.permission_codes ?? []
  };
}