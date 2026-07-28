export function requirePermission(permission) {
  return (req, res, next) => {
    const perms = req.session?.user?.permissions ?? [];
    if (!perms.includes(permission) && !req.session?.user?.isCondominiumAdmin) {
      return res.status(403).render('errors/403', {
        title: 'Acceso denegado',
        message: 'No tiene permisos para esta accion'
      });
    }
    next();
  };
}