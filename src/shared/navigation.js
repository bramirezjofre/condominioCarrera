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
      { label: 'Unidades', href: '/app/unidades', icon: 'door' },
      { label: 'Personas', href: '/app/personas', icon: 'people' },
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
  { label: 'Mi cuenta', href: '/app/mi-cuenta', icon: 'user' }
];

export function findActiveMatch(path) {
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      if (path === item.href) return item;
      if (path?.startsWith(item.href + '/')) return item;
    }
  }
  return null;
}

export function breadcrumbsFor(path) {
  const segments = path.split('/').filter(Boolean);
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
