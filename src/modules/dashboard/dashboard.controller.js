import { getStore, listWhere } from '../../shared/demo/demo-store.js';
import { renderPage } from '../../shared/helpers/render.js';
import { formatCLP, formatDate } from '../../shared/helpers/format.js';

export function buildDashboard(req) {
  const user = req.session.user;
  const store = getStore();
  const towers = listWhere('towers', (t) => !user.isCondominiumAdmin ? user.towerIds.includes(t.id) : true);
  const towerIds = towers.map((t) => t.id);
  const units = listWhere('units', (u) => towerIds.includes(u.towerId));
  const unitIds = units.map((u) => u.id);
  const charges = listWhere('charges', (c) => unitIds.includes(c.unitId));
  const payments = listWhere('payments', (p) => unitIds.includes(p.unitId));
  const maintenance = listWhere('maintenance', (m) => towerIds.includes(listWhere('units', (u) => u.id === m.unitId)[0]?.towerId));
  const parcels = listWhere('parcels', (p) => unitIds.includes(p.unitId) && p.status !== 'delivered');
  const announcements = listWhere('announcements', (a) => a.status === 'published');
  const reservations = listWhere('reservations', (r) => unitIds.includes(r.unitId));
  const audits = listWhere('audits', (a) => towerIds.includes(a.towerId || a.towerId || '') || true).slice(0, 6);

  const totalCharged = charges.reduce((sum, c) => sum + c.totalAmount, 0);
  const totalBalance = charges.reduce((sum, c) => sum + c.balanceAmount, 0);

  const monthly = [0, 1, 2, 3, 4, 5].map((i) => {
    const month = (new Date().getMonth() + 1 - i + 12) % 12 || 12;
    const period = store.periods.find((p) => p.month === month);
    return period ? { label: period.monthName.slice(0, 3), value: period.totalAmount - 1_000_000, height: 60 + (i * 5) } : { label: '?', value: 0, height: 20 };
  });

  const delinquencyByTower = towers.map((t) => {
    const towerUnits = units.filter((u) => u.towerId === t.id).map((u) => u.id);
    const total = charges.filter((c) => towerUnits.includes(c.unitId)).reduce((s, c) => s + c.totalAmount, 0);
    const paid = charges.filter((c) => towerUnits.includes(c.unitId)).reduce((s, c) => s + c.paidAmount, 0);
    const percent = total === 0 ? 0 : Math.round(((total - paid) / total) * 100);
    return { name: t.name, units: towerUnits.length, percent };
  });

  const recentActivity = audits.map((a) => ({
    title: a.action,
    detail: `${formatDate(a.createdAt)} - ${store.people.find((p) => p.id === store.users.find((u) => u.id === a.actorUserId)?.personId)?.fullName || 'Sistema'}`
  }));

  const dashboardStats = [
    { label: 'Residentes activos', value: store.occupancies.filter((o) => o.endsOn === null).length, help: 'Unidades con ocupacion vigente' },
    { label: 'Pagos del mes', value: payments.filter((p) => p.status === 'verified').length, help: 'Verificados en el periodo' },
    { label: 'Pendiente', value: formatCLP(totalBalance), help: `Total facturado ${formatCLP(totalCharged)}` },
    { label: 'Multas activas', value: listWhere('fines', (f) => ['notified', 'confirmed', 'appealed'].includes(f.status)).length, help: 'No pagadas ni anuladas' }
  ];

  return {
    title: 'Panel principal',
    user,
    dashboardStats,
    collectionChart: monthly.reverse(),
    towersCount: towers.length,
    unitsCount: units.length,
    residentsCount: store.occupancies.filter((o) => o.endsOn === null).length,
    paymentsCount: payments.filter((p) => p.status === 'verified').length,
    delinquencyByTower,
    recentActivity,
    maintenanceCount: maintenance.length,
    parcelsCount: parcels.length,
    announcementsCount: announcements.length,
    reservationsCount: reservations.length
  };
}

export function showDashboard(req, res) {
  const data = buildDashboard(req);
  renderPage(req, res, 'dashboard/index', { ...data, title: 'Panel principal' });
}