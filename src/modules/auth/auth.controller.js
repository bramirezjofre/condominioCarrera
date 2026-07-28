import { loginSchema } from './auth.schema.js';
import { authenticate } from './auth.service.js';
import { createAuditEvent } from './auth.repository.js';

function getRequestMeta(req) {
  return {
    ipAddress: req.ip ?? req.headers['x-forwarded-for'] ?? null,
    userAgent: req.headers['user-agent'] ?? null
  };
}

export async function showLoginPage(req, res) {
  if (req.session?.user) {
    return res.redirect('/app');
  }
  return res.render('auth/login', {
    title: 'Iniciar sesion',
    error: null,
    identifier: ''
  });
}

export async function postLogin(req, res, next) {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).render('auth/login', {
        title: 'Iniciar sesion',
        error: 'Datos invalidos',
        identifier: req.body?.identifier ?? ''
      });
    }

    const { ipAddress, userAgent } = getRequestMeta(req);
    const sessionUser = await authenticate({ ...parsed.data, ipAddress, userAgent });

    await new Promise((resolve, reject) => {
      req.session.regenerate((err) => (err ? reject(err) : resolve()));
    });

    req.session.user = sessionUser;
    await new Promise((resolve, reject) => {
      req.session.save((err) => (err ? reject(err) : resolve()));
    });

    return res.redirect('/app');
  } catch (err) {
    if (err.status === 401 || err.status === 403) {
      return res.status(err.status).render('auth/login', {
        title: 'Iniciar sesion',
        error: err.message,
        identifier: req.body?.identifier ?? ''
      });
    }
    return next(err);
  }
}

export async function postLogout(req, res, _next) {
  const userId = req.session?.user?.id ?? null;
  try {
    await createAuditEvent({
      actorUserId: userId,
      action: 'auth.logout',
      entityType: 'app_user',
      entityId: userId,
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null
    });
  } catch {
  }

  req.session.destroy(() => {
    res.clearCookie(req.session?.cookie?.name || 'condominio.sid');
    res.redirect('/login');
  });
}