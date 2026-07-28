export function requireAuth(req, res, next) {
  if (!req.session?.user) {
    if (req.accepts('html')) {
      return res.redirect('/login');
    }
    return res.status(401).json({
      error: { code: 'UNAUTHENTICATED', message: 'Sesion requerida' }
    });
  }
  next();
}