import { ForbiddenError, UnauthorizedError } from '../shared/errors/index.js';

export function authorizeScope({ allowCondominiumAdmin = true } = {}) {
  return (req, res, next) => {
    if (!req.session?.user) {
      return next(new UnauthorizedError('Sesion requerida'));
    }
    const user = req.session.user;
    req.auth = {
      userId: user.id,
      condominiumId: user.condominiumId ?? null,
      isCondominiumAdmin: !!user.isCondominiumAdmin,
      towerIds: user.towerIds ?? [],
      unitIds: user.unitIds ?? [],
      permissions: user.permissions ?? []
    };

    if (allowCondominiumAdmin && req.auth.isCondominiumAdmin) {
      return next();
    }
    if (req.auth.towerIds.length > 0) {
      return next();
    }
    if (req.auth.unitIds.length > 0) {
      return next();
    }
    return next(new ForbiddenError('Sin alcance asignado'));
  };
}

export function ensureCondominiumMatch(req, _res, next) {
  if (!req.session?.user) return next(new UnauthorizedError());
  if (req.session.user.isCondominiumAdmin) return next();
  if (!req.params.condominiumId) return next();
  if (req.session.user.condominiumId !== req.params.condominiumId) {
    return next(new ForbiddenError('Condominio no autorizado'));
  }
  return next();
}

export function ensureTowerInScope(req, _res, next) {
  if (!req.session?.user) return next(new UnauthorizedError());
  const { towerId } = req.params;
  if (!towerId) return next();
  if (req.session.user.isCondominiumAdmin) return next();
  if (!req.session.user.towerIds.includes(towerId)) {
    return next(new ForbiddenError('Torre fuera de alcance'));
  }
  return next();
}

export function requirePermission(permission) {
  return (req, _res, next) => {
    const user = req.session?.user;
    if (!user) return next(new UnauthorizedError());
    if (user.isCondominiumAdmin) return next();
    if (user.permissions?.includes(permission)) return next();
    return next(new ForbiddenError('Permiso insuficiente'));
  };
}