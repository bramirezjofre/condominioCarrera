import { NAV_GROUPS, MOBILE_NAV, breadcrumbsFor } from '../navigation.js';

export function renderPage(req, res, view, locals = {}) {
  const user = req.session?.user ?? {};
  const path = req.path;
  res.render(view, {
    NAV_GROUPS,
    MOBILE_NAV,
    ACTIVEPATH: path,
    user,
    crumbs: breadcrumbsFor(path),
    isDemoBanner: true,
    ...locals
  });
}

export function renderAuth(req, res, view, locals = {}) {
  res.render(view, {
    isDemoBanner: true,
    ...locals
  });
}