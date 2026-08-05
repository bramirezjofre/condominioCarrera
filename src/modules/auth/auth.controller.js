import { renderAuth } from '../../shared/helpers/render.js';
import { env } from '../../config/env.js';
import { buildSessionUser, listMatchingUserId } from '../../shared/demo/demo-auth.js';
import { findById } from '../../shared/demo/demo-store.js';

export function showLoginPage(req, res) {
  if (req.session?.user) {
    return res.redirect('/app');
  }
  renderAuth(req, res, 'auth/login', { title: 'Iniciar sesion', error: null, identifier: '' });
}

export async function postLogin(req, res, next) {
  try {
    const identifier = (req.body?.identifier ?? '').toString().trim();
    const password = (req.body?.password ?? '').toString();
    if (!identifier || !password) {
      return renderAuth(req, res, 'auth/login', { title: 'Iniciar sesion', error: 'Ingrese usuario y contrasena', identifier });
    }

    if (env.DATA_MODE === 'demo') {
      const userId = listMatchingUserId(identifier);
      const user = findById('users', userId);
      if (!user || user.password !== password) {
        return renderAuth(req, res, 'auth/login', { title: 'Iniciar sesion', error: 'Credenciales invalidas', identifier });
      }
      const sessionUser = buildSessionUser(user);
      await new Promise((resolve, reject) => {
        req.session.regenerate((err) => (err ? reject(err) : resolve()));
      });
      req.session.user = sessionUser;
      await new Promise((resolve, reject) => {
        req.session.save((err) => (err ? reject(err) : resolve()));
      });
      return res.redirect('/app');
    }

    return renderAuth(req, res, 'auth/login', { title: 'Iniciar sesion', error: 'Modo no disponible', identifier });
  } catch (err) {
    return next(err);
  }
}

export function postLogout(req, res, _next) {
  req.session.destroy(() => {
    res.clearCookie(req.session?.cookie?.name || 'condominio.sid');
    res.redirect('/login');
  });
}