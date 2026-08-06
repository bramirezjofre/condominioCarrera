export const NAV_GROUPS = [
  {
    id: 'home',
    label: 'Inicio',
    items: [
      { label: 'Panel principal', href: '/app', icon: 'home' }
    ]
  },
  {
    id: 'administration',
    label: 'Administracion',
    items: [
      { label: 'Condominios', href: '/app/condominios', icon: 'building' },
      { label: 'Torres', href: '/app/torres', icon: 'tower' },
      { label: 'Departamentos', href: '/app/departamentos', icon: 'door' },
      { label: 'Residentes', href: '/app/residentes', icon: 'people' },
      { label: 'Usuarios y roles', href: '/app/usuarios', icon: 'users' },
      { label: 'Auditoria', href: '/app/auditoria', icon: 'shield' }
    ]
  },
  {
    id: 'finance',
    label: 'Finanzas',
    items: [
      { label: 'Gastos comunes', href: '/app/gastos-comunes', icon: 'receipt' },
      { label: 'Pagos', href: '/app/pagos', icon: 'cash' },
      { label: 'Morosidad', href: '/app/morosidad', icon: 'alert' },
      { label: 'Reportes', href: '/app/reportes', icon: 'chart' }
    ]
  },
  {
    id: 'operations',
    label: 'Operacion',
    items: [
      { label: 'Multas', href: '/app/multas', icon: 'flag' },
      { label: 'Mantenimientos', href: '/app/mantenimientos', icon: 'wrench' },
      { label: 'Encomiendas', href: '/app/encomiendas', icon: 'box' },
      { label: 'Reservas', href: '/app/reservas', icon: 'calendar' }
    ]
  },
  {
    id: 'community',
    label: 'Comunidad',
    items: [
      { label: 'Comunicados', href: '/app/comunicados', icon: 'megaphone' },
      { label: 'Documentos', href: '/app/documentos', icon: 'file' },
      { label: 'Espacios comunes', href: '/app/espacios-comunes', icon: 'sparkle' },
      { label: 'Notificaciones', href: '/app/notificaciones', icon: 'bell' }
    ]
  }
];

export const MOBILE_NAV = [
  { label: 'Inicio', href: '/app', icon: 'home' },
  { label: 'Pagos', href: '/app/pagos', icon: 'cash' },
  { label: 'Avisos', href: '/app/comunicados', icon: 'megaphone' },
  { label: 'Reservas', href: '/app/reservas', icon: 'calendar' },
  { label: 'Mi cuenta', href: '/mi-cuenta', icon: 'user' }
];

const ALIASES = {
  '/app/residentes': '/app/personas',
  '/app/residentes/nuevo': '/app/personas/nuevo',
  '/app/residentes/:personId': '/app/personas/:personId',
  '/app/residentes/:personId/editar': '/app/personas/:personId/editar',
  '/app/residentes/:personId/ocupaciones': '/app/personas/:personId/ocupaciones',
  '/app/departamentos': '/app/unidades',
  '/mi-cuenta': '/app/mi-cuenta',
  '/mi-unidad': '/app/mi-unidad',
  '/recuperar-acceso': '/app/recuperar-acceso',
  '/cambiar-contrasena': '/app/cambiar-contrasena'
};

export function resolveAlias(path) {
  if (!path) return path;
  if (ALIASES[path]) return ALIASES[path];
  const dynamic = Object.keys(ALIASES).find((k) => k.includes(':'));
  if (dynamic) {
    const regex = new RegExp('^' + dynamic.replace(/:[^/]+/g, '([^/]+)') + '$');
    const m = path.match(regex);
    if (m) {
      let target = ALIASES[dynamic];
      for (let i = 1; i < m.length; i++) target = target.replace(/(:[^/]+)/, m[i]);
      return target;
    }
  }
  return path;
}

export function findActiveMatch(path) {
  const resolved = resolveAlias(path);
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      if (resolved === item.href) return item;
      if (resolved.startsWith(item.href + '/')) return item;
    }
  }
  return null;
}

export function breadcrumbsFor(path) {
  const resolved = resolveAlias(path);
  const segments = resolved.split('/').filter(Boolean);
  const crumbs = [{ label: 'Inicio', href: '/app' }];
  let acc = '';
  for (const seg of segments) {
    acc += '/' + seg;
    crumbs.push({ label: humanize(seg), href: acc });
  }
  return crumbs;
}

function humanize(segment) {
  return segment
    .replace(/-/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase());
}
