import { Router } from 'express';
import { requireAuth } from '../../middleware/authentication.js';
import { renderPage } from '../../shared/helpers/render.js';
import { getStore, listWhere, findById } from '../../shared/demo/demo-store.js';
import { ROLES, ROLE_PERMISSIONS } from '../../shared/demo/roles.js';

export const demoRoutes = Router();

demoRoutes.get('/app/mi-cuenta', requireAuth, (req, res) => {
  const user = req.session.user;
  const person = findById('people', user.personId);
  const towerNames = user.towerIds.map((id) => findById('towers', id)?.name).filter(Boolean);
  const unitNumbers = user.unitIds.map((id) => findById('units', id)?.number).filter(Boolean);
  renderPage(req, res, 'demo/account', {
    title: 'Mi cuenta',
    person,
    roleCodes: user.roleCodes,
    towerNames,
    unitNumbers
  });
});

demoRoutes.get('/app/condominios', requireAuth, (req, res) => {
  const condos = getStore().condominiums;
  renderPage(req, res, 'condominiums/index', { title: 'Condominios', items: condos });
});

demoRoutes.get('/app/condominios/:id', requireAuth, (req, res) => {
  const condo = findById('condominiums', req.params.id);
  if (!condo) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  const towers = listWhere('towers', (t) => t.condominiumId === condo.id);
  renderPage(req, res, 'condominiums/show', { title: condo.name, item: condo, towers });
});

demoRoutes.get('/app/condominios/:id/editar', requireAuth, (req, res) => {
  const condo = findById('condominiums', req.params.id);
  if (!condo) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  renderPage(req, res, 'condominiums/form', { title: `Editar ${condo.name}`, item: condo });
});

demoRoutes.get('/app/torres', requireAuth, (req, res) => {
  const user = req.session.user;
  const towers = listWhere('towers', (t) => user.isCondominiumAdmin || user.towerIds.includes(t.id));
  const enrich = towers.map((t) => {
    const units = listWhere('units', (u) => u.towerId === t.id);
    const admin = getStore().users.find((u) => user.towerIds.includes(t.id) && u.roleCodes?.includes('tower_admin'));
    const adminPerson = admin ? findById('people', admin.personId) : null;
    const delinquency = listWhere('charges', (c) => units.map((u) => u.id).includes(c.unitId));
    const total = delinquency.reduce((s, c) => s + c.totalAmount, 0);
    const paid = delinquency.reduce((s, c) => s + c.paidAmount, 0);
    return {
      ...t,
      unitCount: units.length,
      adminName: adminPerson?.fullName || 'Sin asignar',
      delinquencyPercent: total === 0 ? 0 : Math.round(((total - paid) / total) * 100)
    };
  });
  renderPage(req, res, 'towers/index', { title: 'Torres', items: enrich });
});

demoRoutes.get('/app/torres/:towerId', requireAuth, (req, res) => {
  const tower = findById('towers', req.params.towerId);
  if (!tower) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  const units = listWhere('units', (u) => u.towerId === tower.id);
  const admin = getStore().users.find((u) => u.towerIds.includes(tower.id) && u.roleCodes?.includes('tower_admin'));
  const adminPerson = admin ? findById('people', admin.personId) : null;
  const team = listWhere('towerTeams', (t) => t.towerId === tower.id);
  renderPage(req, res, 'towers/show', {
    title: tower.name,
    tower,
    units,
    admin: adminPerson ? { id: admin.id, name: adminPerson.fullName, email: adminPerson.email } : null,
    team: team.map((m) => ({
      ...m,
      person: findById('people', m.personId),
      user: m.userId ? findById('users', m.userId) : null
    }))
  });
});

demoRoutes.get('/app/torres/:towerId/editar', requireAuth, (req, res) => {
  const tower = findById('towers', req.params.towerId);
  if (!tower) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  renderPage(req, res, 'towers/form', { title: `Editar ${tower.name}`, item: tower });
});

demoRoutes.get('/app/torres/:towerId/administrador', requireAuth, (req, res) => {
  const tower = findById('towers', req.params.towerId);
  if (!tower) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  const candidates = getStore().users.filter((u) => u.roleCodes?.includes('tower_admin')).map((u) => ({
    ...u,
    person: findById('people', u.personId)
  }));
  renderPage(req, res, 'towers/administrator', { title: `${tower.name} - Administrador`, tower, candidates });
});

demoRoutes.get('/app/torres/:towerId/equipo', requireAuth, (req, res) => {
  const tower = findById('towers', req.params.towerId);
  if (!tower) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  const team = listWhere('towerTeams', (t) => t.towerId === tower.id).map((m) => ({
    ...m,
    person: findById('people', m.personId),
    user: m.userId ? findById('users', m.userId) : null
  }));
  renderPage(req, res, 'towers/team', { title: `${tower.name} - Equipo`, tower, team });
});

demoRoutes.get('/app/torres/:towerId/unidades', requireAuth, (req, res) => {
  const tower = findById('towers', req.params.towerId);
  if (!tower) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  const units = listWhere('units', (u) => u.towerId === tower.id).map((u) => {
    const charges = listWhere('charges', (c) => c.unitId === u.id);
    const balance = charges.reduce((s, c) => s + c.balanceAmount, 0);
    const occupant = listWhere('occupancies', (o) => o.unitId === u.id && o.endsOn === null && o.isPrimary)[0];
    return {
      ...u,
      balance,
      occupant: occupant ? findById('people', occupant.personId) : null
    };
  });
  renderPage(req, res, 'units/index', { title: `Unidades - ${tower.name}`, tower, items: units });
});

demoRoutes.get('/app/torres/:towerId/unidades/nuevo', requireAuth, (req, res) => {
  const tower = findById('towers', req.params.towerId);
  if (!tower) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  renderPage(req, res, 'units/form', { title: `Nueva unidad - ${tower.name}`, tower, item: { kind: 'departamento', prorationFactor: 0 } });
});

demoRoutes.get('/app/unidades', requireAuth, (req, res) => {
  const user = req.session.user;
  const towers = listWhere('towers', (t) => user.isCondominiumAdmin || user.towerIds.includes(t.id));
  const towerIds = towers.map((t) => t.id);
  const units = listWhere('units', (u) => towerIds.includes(u.towerId)).map((u) => {
    const tower = findById('towers', u.towerId);
    const charges = listWhere('charges', (c) => c.unitId === u.id);
    const balance = charges.reduce((s, c) => s + c.balanceAmount, 0);
    const occupant = listWhere('occupancies', (o) => o.unitId === u.id && o.endsOn === null && o.isPrimary)[0];
    return {
      ...u,
      towerName: tower?.name,
      balance,
      occupant: occupant ? findById('people', occupant.personId) : null
    };
  });
  renderPage(req, res, 'units/index-all', { title: 'Unidades', items: units });
});

demoRoutes.get('/app/unidades/:unitId', requireAuth, (req, res) => {
  const unit = findById('units', req.params.unitId);
  if (!unit) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  const tower = findById('towers', unit.towerId);
  const occupancies = listWhere('occupancies', (o) => o.unitId === unit.id).map((o) => ({
    ...o,
    person: findById('people', o.personId)
  }));
  const charges = listWhere('charges', (c) => c.unitId === unit.id);
  const balance = charges.reduce((s, c) => s + c.balanceAmount, 0);
  renderPage(req, res, 'units/show', { title: `Unidad ${unit.number}`, unit, tower, occupancies, charges, balance });
});

demoRoutes.get('/app/unidades/:unitId/editar', requireAuth, (req, res) => {
  const unit = findById('units', req.params.unitId);
  if (!unit) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  const tower = findById('towers', unit.towerId);
  renderPage(req, res, 'units/form', { title: `Editar unidad ${unit.number}`, unit, tower });
});

demoRoutes.get('/app/unidades/:unitId/ocupaciones', requireAuth, (req, res) => {
  const unit = findById('units', req.params.unitId);
  if (!unit) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  const tower = findById('towers', unit.towerId);
  const occupancies = listWhere('occupancies', (o) => o.unitId === unit.id).map((o) => ({
    ...o,
    person: findById('people', o.personId)
  }));
  renderPage(req, res, 'occupancies/index', { title: `Ocupaciones - ${unit.number}`, unit, tower, items: occupancies });
});

demoRoutes.get('/app/unidades/:unitId/ocupaciones/nuevo', requireAuth, (req, res) => {
  const unit = findById('units', req.params.unitId);
  if (!unit) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  const tower = findById('towers', unit.towerId);
  const people = getStore().people;
  renderPage(req, res, 'occupancies/form', { title: `Nueva ocupacion - ${unit.number}`, unit, tower, people, item: { startsOn: new Date().toISOString().slice(0, 10) } });
});

demoRoutes.get('/app/personas', requireAuth, (req, res) => {
  const search = req.query.search?.toString() ?? '';
  const people = getStore().people
    .filter((p) => !search || p.fullName.toLowerCase().includes(search.toLowerCase()) || p.email?.toLowerCase().includes(search.toLowerCase()))
    .map((p) => {
      const occ = listWhere('occupancies', (o) => o.personId === p.id && o.endsOn === null);
      const units = occ.map((o) => findById('units', o.unitId)).filter(Boolean);
      return { ...p, units };
    });
  renderPage(req, res, 'people/index', { title: 'Personas', items: people, search });
});

demoRoutes.get('/app/personas/nuevo', requireAuth, (req, res) => {
  renderPage(req, res, 'people/form', { title: 'Nueva persona', item: {} });
});

demoRoutes.get('/app/personas/:personId', requireAuth, (req, res) => {
  const person = findById('people', req.params.personId);
  if (!person) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  const occupancies = listWhere('occupancies', (o) => o.personId === person.id).map((o) => ({
    ...o,
    unit: findById('units', o.unitId),
    tower: findById('towers', findById('units', o.unitId)?.towerId)
  }));
  const user = getStore().users.find((u) => u.personId === person.id);
  renderPage(req, res, 'people/show', { title: person.fullName, person, occupancies, user });
});

demoRoutes.get('/app/personas/:personId/editar', requireAuth, (req, res) => {
  const person = findById('people', req.params.personId);
  if (!person) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  renderPage(req, res, 'people/form', { title: 'Editar persona', item: person });
});

demoRoutes.get('/app/personas/:personId/ocupaciones', requireAuth, (req, res) => {
  const person = findById('people', req.params.personId);
  if (!person) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  const occupancies = listWhere('occupancies', (o) => o.personId === person.id).map((o) => ({
    ...o,
    unit: findById('units', o.unitId),
    tower: findById('towers', findById('units', o.unitId)?.towerId)
  }));
  renderPage(req, res, 'people/occupancies', { title: `${person.fullName} - Ocupaciones`, person, occupancies });
});

demoRoutes.get('/app/gastos-comunes', requireAuth, (req, res) => {
  const periods = getStore().periods.map((p) => {
    const charges = listWhere('charges', (c) => c.periodId === p.id);
    const total = charges.reduce((s, c) => s + c.totalAmount, 0);
    const paid = charges.reduce((s, c) => s + c.paidAmount, 0);
    return { ...p, total, paid, percent: total === 0 ? 0 : Math.round((paid / total) * 100) };
  });
  renderPage(req, res, 'expenses/index', { title: 'Gastos comunes', items: periods });
});

demoRoutes.get('/app/gastos-comunes/nuevo', requireAuth, (req, res) => {
  renderPage(req, res, 'expenses/form', { title: 'Nuevo periodo', item: {} });
});

demoRoutes.get('/app/gastos-comunes/:periodId', requireAuth, (req, res) => {
  const period = findById('periods', req.params.periodId);
  if (!period) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  const charges = listWhere('charges', (c) => c.periodId === period.id).map((c) => ({
    ...c,
    unit: findById('units', c.unitId),
    tower: findById('towers', findById('units', c.unitId)?.towerId)
  }));
  renderPage(req, res, 'expenses/show', { title: `Periodo ${period.monthName}`, period, charges });
});

demoRoutes.get('/app/gastos-comunes/:periodId/editar', requireAuth, (req, res) => {
  const period = findById('periods', req.params.periodId);
  if (!period) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  renderPage(req, res, 'expenses/form', { title: `Editar periodo ${period.monthName}`, item: period });
});

demoRoutes.get('/app/gastos-comunes/:periodId/gastos', requireAuth, (req, res) => {
  const period = findById('periods', req.params.periodId);
  if (!period) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  const categories = getStore().expenseCategories;
  renderPage(req, res, 'expenses/items', { title: `Gastos - ${period.monthName}`, period, categories });
});

demoRoutes.get('/app/gastos-comunes/:periodId/cargos', requireAuth, (req, res) => {
  const period = findById('periods', req.params.periodId);
  if (!period) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  const charges = listWhere('charges', (c) => c.periodId === period.id).map((c) => ({
    ...c,
    unit: findById('units', c.unitId),
    tower: findById('towers', findById('units', c.unitId)?.towerId)
  }));
  renderPage(req, res, 'expenses/charges', { title: `Cargos - ${period.monthName}`, period, charges });
});

demoRoutes.get('/app/pagos', requireAuth, (req, res) => {
  const payments = getStore().payments.map((p) => ({
    ...p,
    unit: findById('units', p.unitId),
    tower: findById('towers', findById('units', p.unitId)?.towerId),
    person: findById('people', p.payerPersonId)
  }));
  renderPage(req, res, 'payments/index', { title: 'Pagos', items: payments });
});

demoRoutes.get('/app/pagos/nuevo', requireAuth, (req, res) => {
  const units = getStore().units;
  const people = getStore().people;
  renderPage(req, res, 'payments/form', { title: 'Registrar pago', units, people, item: { paymentMethod: 'transfer', paidAt: new Date().toISOString().slice(0, 10) } });
});

demoRoutes.get('/app/pagos/:paymentId', requireAuth, (req, res) => {
  const payment = findById('payments', req.params.paymentId);
  if (!payment) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  renderPage(req, res, 'payments/show', {
    title: `Pago ${payment.reference}`,
    item: payment,
    unit: findById('units', payment.unitId),
    person: findById('people', payment.payerPersonId)
  });
});

demoRoutes.get('/app/morosidad', requireAuth, (req, res) => {
  const user = req.session.user;
  const towers = listWhere('towers', (t) => user.isCondominiumAdmin || user.towerIds.includes(t.id));
  const summary = towers.map((t) => {
    const units = listWhere('units', (u) => u.towerId === t.id).map((u) => u.id);
    const charges = listWhere('charges', (c) => units.includes(c.unitId));
    const total = charges.reduce((s, c) => s + c.totalAmount, 0);
    const paid = charges.reduce((s, c) => s + c.paidAmount, 0);
    const overdue = charges.filter((c) => c.status === 'overdue').length;
    return { tower: t, total, paid, balance: total - paid, percent: total === 0 ? 0 : Math.round(((total - paid) / total) * 100), overdueUnits: overdue };
  });
  renderPage(req, res, 'delinquency/index', { title: 'Morosidad', items: summary });
});

demoRoutes.get('/app/morosidad/torres', requireAuth, (req, res) => {
  const user = req.session.user;
  const towers = listWhere('towers', (t) => user.isCondominiumAdmin || user.towerIds.includes(t.id));
  const items = towers.map((t) => {
    const units = listWhere('units', (u) => u.towerId === t.id);
    const unitBalances = units.map((u) => {
      const charges = listWhere('charges', (c) => c.unitId === u.id);
      const balance = charges.reduce((s, c) => s + c.balanceAmount, 0);
      const occupant = listWhere('occupancies', (o) => o.unitId === u.id && o.endsOn === null && o.isPrimary)[0];
      return {
        unit: u,
        balance,
        person: occupant ? findById('people', occupant.personId) : null
      };
    }).filter((row) => row.balance > 0);
    return { tower: t, units: unitBalances };
  });
  renderPage(req, res, 'delinquency/towers', { title: 'Morosidad por torre', items });
});

demoRoutes.get('/app/morosidad/unidades', requireAuth, (req, res) => {
  const user = req.session.user;
  const towers = listWhere('towers', (t) => user.isCondominiumAdmin || user.towerIds.includes(t.id));
  const towerIds = towers.map((t) => t.id);
  const units = listWhere('units', (u) => towerIds.includes(u.towerId)).map((u) => {
    const charges = listWhere('charges', (c) => c.unitId === u.id);
    const balance = charges.reduce((s, c) => s + c.balanceAmount, 0);
    const occupant = listWhere('occupancies', (o) => o.unitId === u.id && o.endsOn === null && o.isPrimary)[0];
    return {
      ...u,
      tower: findById('towers', u.towerId),
      balance,
      person: occupant ? findById('people', occupant.personId) : null
    };
  }).filter((u) => u.balance > 0);
  renderPage(req, res, 'delinquency/units', { title: 'Morosidad por unidad', items: units });
});

demoRoutes.get('/app/multas', requireAuth, (req, res) => {
  const fines = getStore().fines.map((f) => ({
    ...f,
    unit: findById('units', f.unitId),
    person: findById('people', f.personId)
  }));
  renderPage(req, res, 'fines/index', { title: 'Multas', items: fines });
});

demoRoutes.get('/app/multas/nueva', requireAuth, (req, res) => {
  const units = getStore().units;
  const people = getStore().people;
  renderPage(req, res, 'fines/form', { title: 'Nueva multa', units, people, item: { status: 'draft', ruleCode: 'RUIDO', incidentAt: new Date().toISOString().slice(0, 10) } });
});

demoRoutes.get('/app/multas/:fineId', requireAuth, (req, res) => {
  const fine = findById('fines', req.params.fineId);
  if (!fine) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  renderPage(req, res, 'fines/show', {
    title: `Multa ${fine.ruleCode}`,
    item: fine,
    unit: findById('units', fine.unitId),
    person: findById('people', fine.personId)
  });
});

demoRoutes.get('/app/multas/:fineId/editar', requireAuth, (req, res) => {
  const fine = findById('fines', req.params.fineId);
  if (!fine) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  renderPage(req, res, 'fines/form', { title: 'Editar multa', item: fine, units: getStore().units, people: getStore().people });
});

demoRoutes.get('/app/mantenimientos', requireAuth, (req, res) => {
  const requests = getStore().maintenance.map((m) => ({
    ...m,
    unit: findById('units', m.unitId),
    tower: findById('towers', findById('units', m.unitId)?.towerId),
    assignee: m.assignedTo ? findById('users', m.assignedTo) : null
  }));
  renderPage(req, res, 'maintenance/index', { title: 'Mantenimientos', items: requests });
});

demoRoutes.get('/app/mantenimientos/nuevo', requireAuth, (req, res) => {
  const units = getStore().units;
  renderPage(req, res, 'maintenance/form', { title: 'Nueva solicitud', units, item: { priority: 'normal', status: 'new' } });
});

demoRoutes.get('/app/mantenimientos/:requestId', requireAuth, (req, res) => {
  const request = findById('maintenance', req.params.requestId);
  if (!request) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  renderPage(req, res, 'maintenance/show', {
    title: request.title,
    item: request,
    unit: findById('units', request.unitId),
    tower: findById('towers', findById('units', request.unitId)?.towerId),
    assignee: request.assignedTo ? findById('users', request.assignedTo) : null,
    history: [
      { from: 'new', to: 'assigned', at: '2026-07-20' },
      { from: 'assigned', to: 'in_progress', at: '2026-07-22' }
    ]
  });
});

demoRoutes.get('/app/mantenimientos/:requestId/editar', requireAuth, (req, res) => {
  const request = findById('maintenance', req.params.requestId);
  if (!request) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  renderPage(req, res, 'maintenance/form', { title: 'Editar solicitud', item: request, units: getStore().units });
});

demoRoutes.get('/app/mantenimientos/:requestId/asignar', requireAuth, (req, res) => {
  const request = findById('maintenance', req.params.requestId);
  if (!request) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  const users = getStore().users.filter((u) => u.roleCodes?.includes('tower_admin') || u.roleCodes?.includes('tower_team_member'));
  renderPage(req, res, 'maintenance/assign', { title: 'Asignar solicitud', item: request, users });
});

demoRoutes.get('/app/mantenimientos/:requestId/comentarios', requireAuth, (req, res) => {
  const request = findById('maintenance', req.params.requestId);
  if (!request) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  renderPage(req, res, 'maintenance/comments', { title: 'Comentarios', item: request, comments: [] });
});

demoRoutes.get('/app/encomiendas', requireAuth, (req, res) => {
  const parcels = getStore().parcels.map((p) => ({
    ...p,
    unit: findById('units', p.unitId),
    recipient: findById('people', p.recipientPersonId)
  }));
  renderPage(req, res, 'parcels/index', { title: 'Encomiendas', items: parcels });
});

demoRoutes.get('/app/encomiendas/nueva', requireAuth, (req, res) => {
  const units = getStore().units;
  const people = getStore().people;
  renderPage(req, res, 'parcels/form', { title: 'Nueva encomienda', units, people, item: { carrier: 'Starken', receivedAt: new Date().toISOString().slice(0, 10), status: 'received' } });
});

demoRoutes.get('/app/encomiendas/:parcelId', requireAuth, (req, res) => {
  const parcel = findById('parcels', req.params.parcelId);
  if (!parcel) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  renderPage(req, res, 'parcels/show', {
    title: `Encomienda ${parcel.trackingNumber}`,
    item: parcel,
    unit: findById('units', parcel.unitId),
    recipient: findById('people', parcel.recipientPersonId)
  });
});

demoRoutes.get('/app/documentos', requireAuth, (req, res) => {
  const documents = getStore().documents.map((d) => ({
    ...d,
    category: d.categoryId.charAt(0).toUpperCase() + d.categoryId.slice(1)
  }));
  renderPage(req, res, 'documents/index', { title: 'Documentos', items: documents });
});

demoRoutes.get('/app/documentos/nuevo', requireAuth, (req, res) => {
  renderPage(req, res, 'documents/form', { title: 'Nuevo documento', item: { visibility: 'residents' } });
});

demoRoutes.get('/app/documentos/:documentId', requireAuth, (req, res) => {
  const doc = findById('documents', req.params.documentId);
  if (!doc) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  renderPage(req, res, 'documents/show', { title: doc.title, item: doc });
});

demoRoutes.get('/app/comunicados', requireAuth, (req, res) => {
  const announcements = getStore().announcements.map((a) => ({
    ...a,
    author: findById('users', a.createdBy)?.fullName || 'Sistema'
  }));
  renderPage(req, res, 'announcements/index', { title: 'Comunicados', items: announcements });
});

demoRoutes.get('/app/comunicados/nuevo', requireAuth, (req, res) => {
  renderPage(req, res, 'announcements/form', { title: 'Nuevo comunicado', item: { status: 'draft', priority: 'normal' } });
});

demoRoutes.get('/app/comunicados/:announcementId', requireAuth, (req, res) => {
  const announcement = findById('announcements', req.params.announcementId);
  if (!announcement) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  renderPage(req, res, 'announcements/show', {
    title: announcement.title,
    item: announcement,
    author: findById('users', announcement.createdBy)?.fullName || 'Sistema'
  });
});

demoRoutes.get('/app/reservas', requireAuth, (req, res) => {
  const reservations = getStore().reservations.map((r) => ({
    ...r,
    amenity: findById('amenities', r.amenityId),
    unit: findById('units', r.unitId),
    person: findById('people', r.requestedBy)
  }));
  renderPage(req, res, 'reservations/index', { title: 'Reservas', items: reservations });
});

demoRoutes.get('/app/reservas/nueva', requireAuth, (req, res) => {
  const amenities = getStore().amenities;
  const units = getStore().units;
  renderPage(req, res, 'reservations/form', { title: 'Nueva reserva', amenities, units, item: {} });
});

demoRoutes.get('/app/reservas/:reservationId', requireAuth, (req, res) => {
  const reservation = findById('reservations', req.params.reservationId);
  if (!reservation) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  renderPage(req, res, 'reservations/show', {
    title: 'Reserva',
    item: reservation,
    amenity: findById('amenities', reservation.amenityId),
    unit: findById('units', reservation.unitId),
    person: findById('people', reservation.requestedBy)
  });
});

demoRoutes.get('/app/espacios-comunes', requireAuth, (req, res) => {
  renderPage(req, res, 'amenities/index', { title: 'Espacios comunes', items: getStore().amenities });
});

demoRoutes.get('/app/espacios-comunes/nuevo', requireAuth, (req, res) => {
  renderPage(req, res, 'amenities/form', { title: 'Nuevo espacio', item: { requiresApproval: true } });
});

demoRoutes.get('/app/espacios-comunes/:amenityId', requireAuth, (req, res) => {
  const amenity = findById('amenities', req.params.amenityId);
  if (!amenity) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  renderPage(req, res, 'amenities/show', { title: amenity.name, item: amenity });
});

demoRoutes.get('/app/espacios-comunes/:amenityId/horarios', requireAuth, (req, res) => {
  const amenity = findById('amenities', req.params.amenityId);
  if (!amenity) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  renderPage(req, res, 'amenities/schedule', { title: `${amenity.name} - Horarios`, item: amenity });
});

demoRoutes.get('/app/usuarios', requireAuth, (req, res) => {
  const users = getStore().users.map((u) => ({
    ...u,
    person: findById('people', u.personId),
    towers: u.towerIds.map((id) => findById('towers', id)).filter(Boolean)
  }));
  renderPage(req, res, 'users/index', { title: 'Usuarios', items: users });
});

demoRoutes.get('/app/usuarios/nuevo', requireAuth, (req, res) => {
  const people = getStore().people;
  const roles = Object.keys(ROLE_PERMISSIONS);
  const towers = getStore().towers;
  renderPage(req, res, 'users/form', { title: 'Nuevo usuario', people, roles, towers, item: { mustChangePassword: true } });
});

demoRoutes.get('/app/usuarios/:userId', requireAuth, (req, res) => {
  const user = findById('users', req.params.userId);
  if (!user) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  const person = findById('people', user.personId);
  const towers = user.towerIds.map((id) => findById('towers', id)).filter(Boolean);
  renderPage(req, res, 'users/show', { title: user.username, item: user, person, towers });
});

demoRoutes.get('/app/usuarios/:userId/editar', requireAuth, (req, res) => {
  const user = findById('users', req.params.userId);
  if (!user) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  renderPage(req, res, 'users/form', { title: 'Editar usuario', item: user, people: getStore().people, roles: Object.keys(ROLE_PERMISSIONS), towers: getStore().towers });
});

demoRoutes.get('/app/usuarios/:userId/asignaciones', requireAuth, (req, res) => {
  const user = findById('users', req.params.userId);
  if (!user) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  renderPage(req, res, 'users/assignments', {
    title: 'Asignaciones',
    item: user,
    towers: user.towerIds.map((id) => findById('towers', id)).filter(Boolean)
  });
});

demoRoutes.get('/app/roles', requireAuth, (req, res) => {
  const data = Object.values(ROLES).map((code) => ({
    code,
    label: code.replace(/_/g, ' '),
    permissions: ROLE_PERMISSIONS[code] ?? []
  }));
  renderPage(req, res, 'users/roles', { title: 'Roles', items: data });
});

demoRoutes.get('/app/reportes', requireAuth, (req, res) => {
  renderPage(req, res, 'reports/index', { title: 'Reportes' });
});

demoRoutes.get('/app/reportes/financiero', requireAuth, (req, res) => {
  renderPage(req, res, 'reports/financial', { title: 'Reporte financiero' });
});

demoRoutes.get('/app/reportes/recaudacion', requireAuth, (req, res) => {
  renderPage(req, res, 'reports/collection', { title: 'Recaudacion' });
});

demoRoutes.get('/app/reportes/morosidad', requireAuth, (req, res) => {
  renderPage(req, res, 'reports/delinquency', { title: 'Reporte de morosidad' });
});

demoRoutes.get('/app/reportes/gastos', requireAuth, (req, res) => {
  renderPage(req, res, 'reports/expenses', { title: 'Reporte de gastos' });
});

demoRoutes.get('/app/reportes/mantenimientos', requireAuth, (req, res) => {
  renderPage(req, res, 'reports/maintenance', { title: 'Reporte de mantenimiento' });
});

demoRoutes.get('/app/reportes/multas', requireAuth, (req, res) => {
  renderPage(req, res, 'reports/fines', { title: 'Reporte de multas' });
});

demoRoutes.get('/app/reportes/encomiendas', requireAuth, (req, res) => {
  renderPage(req, res, 'reports/parcels', { title: 'Reporte de encomiendas' });
});

demoRoutes.get('/app/reportes/reservas', requireAuth, (req, res) => {
  renderPage(req, res, 'reports/reservations', { title: 'Reporte de reservas' });
});

demoRoutes.get('/app/auditoria', requireAuth, (req, res) => {
  const audits = getStore().audits.map((a) => ({
    ...a,
    actor: findById('users', a.actorUserId)?.fullName || 'Sistema'
  }));
  renderPage(req, res, 'audit/index', { title: 'Auditoria', items: audits });
});

demoRoutes.get('/app/notificaciones', requireAuth, (req, res) => {
  const user = req.session.user;
  const all = getStore().notifications.filter((n) => n.userId === user.id || user.isCondominiumAdmin);
  renderPage(req, res, 'notifications/index', { title: 'Notificaciones', items: all });
});

demoRoutes.get('/app/configuracion', requireAuth, (req, res) => {
  renderPage(req, res, 'demo/settings', { title: 'Configuracion' });
});

demoRoutes.get('/app/recuperar-acceso', (req, res) => {
  renderPage(req, res, 'auth/recover', { title: 'Recuperar acceso' });
});

demoRoutes.get('/app/cambiar-contrasena', requireAuth, (req, res) => {
  renderPage(req, res, 'auth/change-password', { title: 'Cambiar contrasena' });
});