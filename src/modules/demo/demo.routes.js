import { Router } from 'express';
import { requireAuth } from '../../middleware/authentication.js';
import { renderPage } from '../../shared/helpers/render.js';
import {
  getStore,
  listWhere,
  findById,
  insert,
  update,
  nextId
} from '../../shared/demo/demo-store.js';
import {
  userCanAccessTower,
  userCanAccessUnit,
  userCanAccessCondominium,
  filterTowersForUser,
  filterUnitsForUser,
  filterPaymentsForUser,
  filterFinesForUser,
  filterParcelsForUser,
  filterReservationsForUser,
  filterMaintenanceForUser,
  filterPeopleForUser
} from '../../shared/demo/demo-scope.js';
import { ROLES, ROLE_PERMISSIONS } from '../../shared/demo/roles.js';
import { todayISO, datePlusDaysISO } from '../../shared/demo/ids.js';

export const demoRoutes = Router();

function flash(req, type, message) {
  req.session.flash = { type, message };
}

function consumeFlash(req) {
  const f = req.session.flash;
  req.session.flash = null;
  return f;
}

function readBody(req) {
  const body = req.body ?? {};
  const out = {};
  for (const k of Object.keys(body)) out[k] = typeof body[k] === 'string' ? body[k].trim() : body[k];
  return out;
}

function bad(res, message, status = 400) {
  flash(res.req, 'error', message);
  res.status(status).redirect('back');
}

function recordAudit(req, action, entityType, entityId, summary) {
  const store = getStore();
  store.audits = [
    {
      id: nextId('aud'),
      condominiumId: req.session.user.condominiumId,
      actorUserId: req.session.user.id,
      action,
      entityType,
      entityId,
      summary,
      createdAt: todayISO()
    },
    ...store.audits
  ];
}

function sendCsv(res, filename, rows) {
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}-${todayISO()}.csv"`);
  res.send(csv);
}

function countByStatus(items) {
  return items.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {});
}

function ensureCondominiumMatch(req, res, next) {
  const user = req.session.user;
  if (!userCanAccessCondominium(user, user.condominiumId)) {
    flash(req, 'error', 'Condominio fuera de alcance');
    return res.redirect('/app');
  }
  next();
}

demoRoutes.use(requireAuth, ensureCondominiumMatch);

demoRoutes.use((req, res, next) => {
  res.locals.flash = consumeFlash(req);
  next();
});

demoRoutes.get('/app/mi-cuenta', (req, res) => {
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

demoRoutes.get('/app/mi-unidad', (req, res) => {
  const user = req.session.user;
  const units = user.unitIds.map((id) => findById('units', id)).filter(Boolean);
  const occupancies = listWhere('occupancies', (o) => user.unitIds.includes(o.unitId) && o.endsOn === null);
  const payments = filterPaymentsForUser(user);
  const fines = filterFinesForUser(user);
  const parcels = filterParcelsForUser(user);
  renderPage(req, res, 'demo/my-unit', {
    title: 'Mi unidad',
    units,
    occupancies,
    payments,
    fines,
    parcels
  });
});

demoRoutes.get('/app/recuperar-acceso', (req, res) => {
  renderPage(req, res, 'auth/recover', { title: 'Recuperar acceso' });
});

demoRoutes.get('/app/cambiar-contrasena', (req, res) => {
  renderPage(req, res, 'auth/change-password', { title: 'Cambiar contrasena', user: req.session.user });
});

demoRoutes.post('/app/condominios/:id/editar', (req, res) => {
  const user = req.session.user;
  if (!user.isCondominiumAdmin) return res.status(403).render('errors/403', { title: 'Acceso denegado', message: 'Permisos insuficientes' });
  const id = req.params.id;
  const condo = findById('condominiums', id);
  if (!condo) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  const body = readBody(req);
  update('condominiums', id, {
    name: body.name || condo.name,
    legalName: body.legalName || condo.legalName,
    taxId: body.taxId || condo.taxId,
    currency: body.currency || condo.currency,
    address: body.address || condo.address,
    commune: body.commune || condo.commune,
    region: body.region || condo.region
  });
  flash(req, 'success', 'Condominio actualizado');
  recordAudit(req, 'condominiums.update', 'condominium', id, 'Datos institucionales editados');
  res.redirect(`/app/condominios/${id}`);
});

demoRoutes.get('/app/condominios', (req, res) => {
  const condos = getStore().condominiums;
  renderPage(req, res, 'condominiums/index', { title: 'Condominios', items: condos });
});

demoRoutes.get('/app/condominios/:id', (req, res) => {
  const condo = findById('condominiums', req.params.id);
  if (!condo) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  const towers = listWhere('towers', (t) => t.condominiumId === condo.id);
  const enriched = towers.map((t) => ({
    ...t,
    unitCount: listWhere('units', (u) => u.towerId === t.id).length
  }));
  renderPage(req, res, 'condominiums/show', { title: condo.name, item: condo, towers: enriched });
});

demoRoutes.get('/app/condominios/:id/editar', (req, res) => {
  const user = req.session.user;
  if (!user.isCondominiumAdmin) return res.status(403).render('errors/403', { title: 'Acceso denegado', message: 'Permisos insuficientes' });
  const condo = findById('condominiums', req.params.id);
  if (!condo) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  renderPage(req, res, 'condominiums/form', { title: `Editar ${condo.name}`, item: condo, formAction: `/app/condominios/${condo.id}/editar`, errors: {}, cancelHref: `/app/condominios/${condo.id}` });
});

demoRoutes.get('/app/configuracion', (req, res) => {
  const user = req.session.user;
  if (!user.isCondominiumAdmin) return res.status(403).render('errors/403', { title: 'Acceso denegado', message: 'Permisos insuficientes' });
  renderPage(req, res, 'demo/settings', { title: 'Configuracion' });
});

demoRoutes.get('/app/torres', (req, res) => {
  const user = req.session.user;
  const towers = filterTowersForUser(user);
  const enriched = towers.map((t) => {
    const units = listWhere('units', (u) => u.towerId === t.id);
    const admin = getStore().users.find((u) => (u.towerIds ?? []).includes(t.id) && (u.roleCodes ?? []).includes(ROLES.TOWER_ADMIN));
    const adminPerson = admin ? findById('people', admin.personId) : null;
    return {
      ...t,
      unitCount: units.length,
      adminName: adminPerson?.fullName || 'Sin asignar'
    };
  });
  renderPage(req, res, 'towers/index', { title: 'Torres', items: enriched });
});

demoRoutes.get('/app/torres/nuevo', (req, res) => {
  const user = req.session.user;
  if (!user.isCondominiumAdmin) return res.status(403).render('errors/403', { title: 'Acceso denegado', message: 'Permisos insuficientes' });
  renderPage(req, res, 'towers/form', {
    title: 'Nueva torre',
    item: { name: '', code: '', floorCount: 1, addressDetail: '' },
    formAction: '/app/torres/nuevo',
    cancelHref: '/app/torres',
    errors: {}
  });
});

demoRoutes.post('/app/torres/nuevo', (req, res) => {
  const user = req.session.user;
  if (!user.isCondominiumAdmin) return res.status(403).render('errors/403', { title: 'Acceso denegado', message: 'Permisos insuficientes' });
  const body = readBody(req);
  const errors = {};
  if (!body.name) errors.name = 'Requerido';
  if (!body.code) errors.code = 'Requerido';
  const floorCount = Number(body.floorCount) || 1;
  if (floorCount < 1) errors.floorCount = 'Debe ser >= 1';
  if (Object.keys(errors).length) {
    return renderPage(req, res, 'towers/form', {
      title: 'Nueva torre',
      item: body,
      formAction: '/app/torres/nuevo',
      cancelHref: '/app/torres',
      errors
    });
  }
  const id = nextId('tow');
  insert('towers', {
    id,
    condominiumId: user.condominiumId,
    name: body.name,
    code: body.code,
    addressDetail: body.addressDetail || '',
    floorCount,
    active: true
  });
  flash(req, 'success', 'Torre creada');
  recordAudit(req, 'towers.create', 'tower', id, `Torre ${body.name} creada`);
  res.redirect(`/app/torres/${id}`);
});

demoRoutes.get('/app/torres/:towerId', (req, res) => {
  const user = req.session.user;
  if (!userCanAccessTower(user, req.params.towerId)) return res.status(403).render('errors/403', { title: 'Acceso denegado', message: 'Torre fuera de alcance' });
  const tower = findById('towers', req.params.towerId);
  if (!tower) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  const units = listWhere('units', (u) => u.towerId === tower.id);
  const admin = getStore().users.find((u) => (u.towerIds ?? []).includes(tower.id) && (u.roleCodes ?? []).includes(ROLES.TOWER_ADMIN));
  const adminPerson = admin ? findById('people', admin.personId) : null;
  const team = listWhere('towerTeams', (t) => t.towerId === tower.id).map((m) => ({
    ...m,
    person: findById('people', m.personId),
    user: m.userId ? findById('users', m.userId) : null
  }));
  renderPage(req, res, 'towers/show', {
    title: tower.name,
    tower,
    units,
    admin: adminPerson ? { id: admin.id, name: adminPerson.fullName, email: adminPerson.email } : null,
    team
  });
});

demoRoutes.get('/app/torres/:towerId/editar', (req, res) => {
  const user = req.session.user;
  if (!user.isCondominiumAdmin) return res.status(403).render('errors/403', { title: 'Acceso denegado', message: 'Permisos insuficientes' });
  const tower = findById('towers', req.params.towerId);
  if (!tower) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  renderPage(req, res, 'towers/form', {
    title: `Editar ${tower.name}`,
    item: tower,
    formAction: `/app/torres/${tower.id}/editar`,
    cancelHref: `/app/torres/${tower.id}`,
    errors: {}
  });
});

demoRoutes.post('/app/torres/:towerId/editar', (req, res) => {
  const user = req.session.user;
  if (!user.isCondominiumAdmin) return res.status(403).render('errors/403', { title: 'Acceso denegado', message: 'Permisos insuficientes' });
  const tower = findById('towers', req.params.towerId);
  if (!tower) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  const body = readBody(req);
  const floorCount = Number(body.floorCount) || tower.floorCount;
  update('towers', tower.id, {
    name: body.name || tower.name,
    code: body.code || tower.code,
    addressDetail: body.addressDetail || tower.addressDetail,
    floorCount
  });
  flash(req, 'success', 'Torre actualizada');
  recordAudit(req, 'towers.update', 'tower', tower.id, 'Torre editada');
  res.redirect(`/app/torres/${tower.id}`);
});

demoRoutes.get('/app/torres/:towerId/administrador', (req, res) => {
  const user = req.session.user;
  if (!userCanAccessTower(user, req.params.towerId)) return res.status(403).render('errors/403', { title: 'Acceso denegado', message: 'Torre fuera de alcance' });
  const tower = findById('towers', req.params.towerId);
  if (!tower) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  if (!user.isCondominiumAdmin) return res.status(403).render('errors/403', { title: 'Acceso denegado', message: 'Permisos insuficientes' });
  const candidates = getStore().users
    .filter((u) => (u.roleCodes ?? []).includes(ROLES.TOWER_ADMIN))
    .map((u) => ({ ...u, person: findById('people', u.personId) }));
  renderPage(req, res, 'towers/administrator', {
    title: `${tower.name} - Administrador`,
    tower,
    candidates,
    formAction: `/app/torres/${tower.id}/administrador`,
    cancelHref: `/app/torres/${tower.id}`
  });
});

demoRoutes.post('/app/torres/:towerId/administrador', (req, res) => {
  const user = req.session.user;
  if (!user.isCondominiumAdmin) return res.status(403).render('errors/403', { title: 'Acceso denegado', message: 'Permisos insuficientes' });
  const tower = findById('towers', req.params.towerId);
  if (!tower) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  const body = readBody(req);
  if (!body.userId) return bad(res, 'Selecciona un usuario');
  const newAdmin = findById('users', body.userId);
  if (!newAdmin) return bad(res, 'Usuario no valido');
  if (!(newAdmin.roleCodes ?? []).includes(ROLES.TOWER_ADMIN)) return bad(res, 'El usuario no tiene rol de administrador de torre');
  const removedTowers = (newAdmin.towerIds ?? []).filter((id) => id !== tower.id);
  const oldAdmin = getStore().users.find((u) => (u.towerIds ?? []).includes(tower.id) && (u.roleCodes ?? []).includes(ROLES.TOWER_ADMIN));
  if (oldAdmin && oldAdmin.id !== newAdmin.id) {
    update('users', oldAdmin.id, { towerIds: (oldAdmin.towerIds ?? []).filter((id) => id !== tower.id) });
  }
  const newTowerIds = removedTowers.includes(tower.id) ? removedTowers : [...removedTowers, tower.id];
  update('users', newAdmin.id, { towerIds: newTowerIds });
  flash(req, 'success', 'Administrador asignado');
  recordAudit(req, 'towers.assign_administrator', 'tower', tower.id, `Admin ${newAdmin.username} asignado`);
  res.redirect(`/app/torres/${tower.id}`);
});

demoRoutes.get('/app/torres/:towerId/equipo', (req, res) => {
  const user = req.session.user;
  if (!userCanAccessTower(user, req.params.towerId)) return res.status(403).render('errors/403', { title: 'Acceso denegado', message: 'Torre fuera de alcance' });
  const tower = findById('towers', req.params.towerId);
  if (!tower) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  const team = listWhere('towerTeams', (t) => t.towerId === tower.id).map((m) => ({
    ...m,
    person: findById('people', m.personId),
    user: m.userId ? findById('users', m.userId) : null
  }));
  renderPage(req, res, 'towers/team', { title: `Equipo - ${tower.name}`, tower, team });
});

demoRoutes.get('/app/torres/:towerId/unidades', (req, res) => {
  const user = req.session.user;
  if (!userCanAccessTower(user, req.params.towerId)) return res.status(403).render('errors/403', { title: 'Acceso denegado', message: 'Torre fuera de alcance' });
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

demoRoutes.get('/app/torres/:towerId/unidades/nuevo', (req, res) => {
  const user = req.session.user;
  if (!userCanAccessTower(user, req.params.towerId)) return res.status(403).render('errors/403', { title: 'Acceso denegado', message: 'Torre fuera de alcance' });
  const tower = findById('towers', req.params.towerId);
  if (!tower) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  if (!user.isCondominiumAdmin) return res.status(403).render('errors/403', { title: 'Acceso denegado', message: 'Permisos insuficientes' });
  renderPage(req, res, 'units/form', {
    title: `Nueva unidad - ${tower.name}`,
    tower,
    item: { kind: 'departamento', prorationFactor: 0.001, areaM2: 60, floor: 1, number: '' },
    formAction: `/app/torres/${tower.id}/unidades/nuevo`,
    cancelHref: `/app/torres/${tower.id}/unidades`,
    errors: {}
  });
});

demoRoutes.post('/app/torres/:towerId/unidades/nuevo', (req, res) => {
  const user = req.session.user;
  if (!user.isCondominiumAdmin) return res.status(403).render('errors/403', { title: 'Acceso denegado', message: 'Permisos insuficientes' });
  const tower = findById('towers', req.params.towerId);
  if (!tower) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  const body = readBody(req);
  const errors = {};
  if (!body.number) errors.number = 'Requerido';
  const prorationFactor = Number(body.prorationFactor);
  if (!Number.isFinite(prorationFactor) || prorationFactor <= 0) errors.prorationFactor = 'Debe ser mayor a 0';
  const floor = Number(body.floor) || 1;
  const areaM2 = Number(body.areaM2) || 0;
  const duplicate = listWhere('units', (u) => u.towerId === tower.id && u.number === body.number);
  if (duplicate.length) errors.number = 'Numero ya existe en la torre';
  if (Object.keys(errors).length) {
    return renderPage(req, res, 'units/form', {
      title: `Nueva unidad - ${tower.name}`,
      tower,
      item: { ...body, floor, prorationFactor, areaM2 },
      formAction: `/app/torres/${tower.id}/unidades/nuevo`,
      cancelHref: `/app/torres/${tower.id}/unidades`,
      errors
    });
  }
  const kind = ['departamento', 'local', 'bodega', 'estacionamiento', 'otro'].includes(body.kind) ? body.kind : 'departamento';
  const id = nextId('uni');
  insert('units', {
    id,
    condominiumId: tower.condominiumId,
    towerId: tower.id,
    number: body.number,
    floor,
    kind,
    prorationFactor,
    areaM2,
    active: true
  });
  flash(req, 'success', 'Unidad creada');
  recordAudit(req, 'units.create', 'unit', id, `Unidad ${body.number} creada`);
  res.redirect(`/app/torres/${tower.id}/unidades`);
});

demoRoutes.get('/app/unidades', (req, res) => {
  const user = req.session.user;
  const units = filterUnitsForUser(user).map((u) => {
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

demoRoutes.get('/app/unidades/:unitId', (req, res) => {
  const user = req.session.user;
  if (!userCanAccessUnit(user, req.params.unitId)) return res.status(403).render('errors/403', { title: 'Acceso denegado', message: 'Unidad fuera de alcance' });
  const unit = findById('units', req.params.unitId);
  if (!unit) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  const tower = findById('towers', unit.towerId);
  const occupancies = listWhere('occupancies', (o) => o.unitId === unit.id).map((o) => ({
    ...o,
    person: findById('people', o.personId)
  }));
  const charges = listWhere('charges', (c) => c.unitId === unit.id);
  const balance = charges.reduce((s, c) => s + c.balanceAmount, 0);
  renderPage(req, res, 'units/show', {
    title: `Unidad ${unit.number}`,
    unit,
    tower,
    occupancies,
    charges,
    balance
  });
});

demoRoutes.get('/app/unidades/:unitId/editar', (req, res) => {
  const user = req.session.user;
  if (!user.isCondominiumAdmin) return res.status(403).render('errors/403', { title: 'Acceso denegado', message: 'Permisos insuficientes' });
  const unit = findById('units', req.params.unitId);
  if (!unit) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  const tower = findById('towers', unit.towerId);
  renderPage(req, res, 'units/form', {
    title: `Editar unidad ${unit.number}`,
    unit,
    tower,
    formAction: `/app/unidades/${unit.id}/editar`,
    cancelHref: `/app/unidades/${unit.id}`,
    errors: {}
  });
});

demoRoutes.post('/app/unidades/:unitId/editar', (req, res) => {
  const user = req.session.user;
  if (!user.isCondominiumAdmin) return res.status(403).render('errors/403', { title: 'Acceso denegado', message: 'Permisos insuficientes' });
  const unit = findById('units', req.params.unitId);
  if (!unit) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  const body = readBody(req);
  const prorationFactor = Number(body.prorationFactor) || unit.prorationFactor;
  if (prorationFactor <= 0) return bad(res, 'Prorrateo debe ser positivo');
  const kind = ['departamento', 'local', 'bodega', 'estacionamiento', 'otro'].includes(body.kind) ? body.kind : unit.kind;
  update('units', unit.id, {
    number: body.number || unit.number,
    floor: Number(body.floor) || unit.floor,
    kind,
    prorationFactor,
    areaM2: Number(body.areaM2) || unit.areaM2,
    active: body.active === 'on' || body.active === 'true'
  });
  flash(req, 'success', 'Unidad actualizada');
  recordAudit(req, 'units.update', 'unit', unit.id, 'Unidad editada');
  res.redirect(`/app/unidades/${unit.id}`);
});

demoRoutes.post('/app/unidades/:unitId/estado', (req, res) => {
  const user = req.session.user;
  if (!user.isCondominiumAdmin) return res.status(403).render('errors/403', { title: 'Acceso denegado', message: 'Permisos insuficientes' });
  const unit = findById('units', req.params.unitId);
  if (!unit) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  const body = readBody(req);
  update('units', unit.id, {
    active: body.active === 'true' || body.active === 'on'
  });
  flash(req, 'success', body.active === 'true' || body.active === 'on' ? 'Unidad activada' : 'Unidad desactivada');
  recordAudit(req, 'units.update', 'unit', unit.id, 'Cambio de estado');
  res.redirect(`/app/unidades/${unit.id}`);
});

demoRoutes.get('/app/unidades/:unitId/ocupaciones', (req, res) => {
  const user = req.session.user;
  if (!userCanAccessUnit(user, req.params.unitId)) return res.status(403).render('errors/403', { title: 'Acceso denegado', message: 'Unidad fuera de alcance' });
  const unit = findById('units', req.params.unitId);
  if (!unit) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  const tower = findById('towers', unit.towerId);
  const occupancies = listWhere('occupancies', (o) => o.unitId === unit.id).map((o) => ({
    ...o,
    person: findById('people', o.personId)
  }));
  renderPage(req, res, 'occupancies/index', { title: `Ocupaciones - ${unit.number}`, unit, tower, items: occupancies });
});

demoRoutes.get('/app/unidades/:unitId/ocupaciones/nuevo', (req, res) => {
  const user = req.session.user;
  if (!userCanAccessUnit(user, req.params.unitId)) return res.status(403).render('errors/403', { title: 'Acceso denegado', message: 'Unidad fuera de alcance' });
  const unit = findById('units', req.params.unitId);
  if (!unit) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  const tower = findById('towers', unit.towerId);
  const people = getStore().people;
  renderPage(req, res, 'occupancies/form', {
    title: `Nueva ocupacion - ${unit.number}`,
    unit,
    tower,
    people,
    item: { startsOn: todayISO(), occupancyType: 'owner', isPrimary: true, receivesBilling: true, receivesNotifications: true },
    formAction: `/app/unidades/${unit.id}/ocupaciones/nuevo`,
    cancelHref: `/app/unidades/${unit.id}/ocupaciones`,
    errors: {}
  });
});

demoRoutes.post('/app/unidades/:unitId/ocupaciones/nuevo', (req, res) => {
  const user = req.session.user;
  if (!userCanAccessUnit(user, req.params.unitId)) return res.status(403).render('errors/403', { title: 'Acceso denegado', message: 'Unidad fuera de alcance' });
  const unit = findById('units', req.params.unitId);
  if (!unit) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  const body = readBody(req);
  const errors = {};
  if (!body.personId) errors.personId = 'Requerido';
  if (!body.startsOn) errors.startsOn = 'Requerido';
  if (Object.keys(errors).length) {
    return renderPage(req, res, 'occupancies/form', {
      title: `Nueva ocupacion - ${unit.number}`,
      unit,
      people: getStore().people,
      item: body,
      formAction: `/app/unidades/${unit.id}/ocupaciones/nuevo`,
      cancelHref: `/app/unidades/${unit.id}/ocupaciones`,
      errors
    });
  }
  if (body.isPrimary === 'on') {
    listWhere('occupancies', (o) => o.unitId === unit.id && o.endsOn === null && o.isPrimary).forEach((o) => {
      update('occupancies', o.id, { isPrimary: false });
    });
  }
  const id = nextId('occ');
  insert('occupancies', {
    id,
    condominiumId: unit.condominiumId,
    unitId: unit.id,
    personId: body.personId,
    occupancyType: body.occupancyType || 'owner',
    isPrimary: body.isPrimary === 'on',
    startsOn: body.startsOn,
    endsOn: null,
    receivesBilling: body.receivesBilling === 'on',
    receivesNotifications: body.receivesNotifications === 'on',
    notes: body.notes || ''
  });
  flash(req, 'success', 'Ocupacion creada');
  recordAudit(req, 'occupancies.create', 'occupancy', id, 'Nueva ocupacion');
  res.redirect(`/app/unidades/${unit.id}/ocupaciones`);
});

demoRoutes.post('/app/ocupaciones/:occupancyId/finalizar', (req, res) => {
  const user = req.session.user;
  const occ = findById('occupancies', req.params.occupancyId);
  if (!occ) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  if (!userCanAccessUnit(user, occ.unitId)) return res.status(403).render('errors/403', { title: 'Acceso denegado', message: 'Unidad fuera de alcance' });
  update('occupancies', occ.id, { endsOn: todayISO() });
  flash(req, 'success', 'Ocupacion finalizada');
  recordAudit(req, 'occupancies.end', 'occupancy', occ.id, 'Cierre de ocupacion');
  res.redirect(`/app/unidades/${occ.unitId}/ocupaciones`);
});

demoRoutes.get('/app/personas', (req, res) => {
  const user = req.session.user;
  const search = (req.query.search ?? '').toString();
  const base = filterPeopleForUser(user);
  const items = base
    .filter((p) => !search || p.fullName.toLowerCase().includes(search.toLowerCase()) || (p.email ?? '').toLowerCase().includes(search.toLowerCase()))
    .map((p) => {
      const occ = listWhere('occupancies', (o) => o.personId === p.id && o.endsOn === null);
      const units = occ.map((o) => findById('units', o.unitId)).filter(Boolean);
      return { ...p, units };
    });
  renderPage(req, res, 'people/index', { title: 'Residentes', items, search });
});

demoRoutes.get('/app/personas/nuevo', (req, res) => {
  const user = req.session.user;
  if (!user.roleCodes?.includes(ROLES.CONDOMINIUM_ADMIN) && !user.roleCodes?.includes(ROLES.TOWER_ADMIN)) return res.status(403).render('errors/403', { title: 'Acceso denegado', message: 'Permisos insuficientes' });
  renderPage(req, res, 'people/form', {
    title: 'Nueva persona',
    item: { firstName: '', lastName: '', email: '', phone: '', birthDate: '', nationalId: '' },
    formAction: '/app/personas/nuevo',
    cancelHref: '/app/personas',
    errors: {}
  });
});

demoRoutes.post('/app/personas/nuevo', (req, res) => {
  const user = req.session.user;
  if (!user.roleCodes?.includes(ROLES.CONDOMINIUM_ADMIN) && !user.roleCodes?.includes(ROLES.TOWER_ADMIN)) return res.status(403).render('errors/403', { title: 'Acceso denegado', message: 'Permisos insuficientes' });
  const body = readBody(req);
  const errors = {};
  if (!body.firstName) errors.firstName = 'Requerido';
  if (!body.lastName) errors.lastName = 'Requerido';
  if (body.email && !/^\S+@\S+\.\S+$/.test(body.email)) errors.email = 'Email no valido';
  if (Object.keys(errors).length) {
    return renderPage(req, res, 'people/form', {
      title: 'Nueva persona',
      item: body,
      formAction: '/app/personas/nuevo',
      cancelHref: '/app/personas',
      errors
    });
  }
  const id = nextId('per');
  insert('people', {
    id,
    firstName: body.firstName,
    lastName: body.lastName,
    fullName: `${body.firstName} ${body.lastName}`,
    email: body.email || '',
    phone: body.phone || '',
    birthDate: body.birthDate || '',
    nationalId: body.nationalId || '',
    notes: '',
    active: true
  });
  flash(req, 'success', 'Persona creada');
  recordAudit(req, 'people.create', 'person', id, `Persona ${body.firstName} ${body.lastName}`);
  res.redirect(`/app/personas/${id}`);
});

demoRoutes.get('/app/personas/:personId', (req, res) => {
  const user = req.session.user;
  const person = findById('people', req.params.personId);
  if (!person) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  if (!user.isCondominiumAdmin && person.id !== user.personId) {
    const allowedIds = new Set(filterPeopleForUser(user).map((p) => p.id));
    if (!allowedIds.has(person.id)) return res.status(403).render('errors/403', { title: 'Acceso denegado', message: 'Persona fuera de alcance' });
  }
  const occupancies = listWhere('occupancies', (o) => o.personId === person.id).map((o) => ({
    ...o,
    unit: findById('units', o.unitId),
    tower: findById('towers', findById('units', o.unitId)?.towerId)
  }));
  const linkedUser = getStore().users.find((u) => u.personId === person.id);
  renderPage(req, res, 'people/show', { title: person.fullName, person, occupancies, user: linkedUser });
});

demoRoutes.get('/app/personas/:personId/editar', (req, res) => {
  const user = req.session.user;
  if (!user.isCondominiumAdmin && !user.roleCodes?.includes(ROLES.TOWER_ADMIN)) return res.status(403).render('errors/403', { title: 'Acceso denegado', message: 'Permisos insuficientes' });
  const person = findById('people', req.params.personId);
  if (!person) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  renderPage(req, res, 'people/form', {
    title: `Editar ${person.fullName}`,
    item: person,
    formAction: `/app/personas/${person.id}/editar`,
    cancelHref: `/app/personas/${person.id}`,
    errors: {}
  });
});

demoRoutes.post('/app/personas/:personId/editar', (req, res) => {
  const user = req.session.user;
  if (!user.isCondominiumAdmin && !user.roleCodes?.includes(ROLES.TOWER_ADMIN)) return res.status(403).render('errors/403', { title: 'Acceso denegado', message: 'Permisos insuficientes' });
  const person = findById('people', req.params.personId);
  if (!person) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  const body = readBody(req);
  const firstName = body.firstName || person.firstName;
  const lastName = body.lastName || person.lastName;
  update('people', person.id, {
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`,
    email: body.email || person.email,
    phone: body.phone || person.phone,
    birthDate: body.birthDate || person.birthDate,
    nationalId: body.nationalId || person.nationalId
  });
  flash(req, 'success', 'Persona actualizada');
  recordAudit(req, 'people.update', 'person', person.id, 'Persona editada');
  res.redirect(`/app/personas/${person.id}`);
});

demoRoutes.get('/app/personas/:personId/ocupaciones', (req, res) => {
  const person = findById('people', req.params.personId);
  if (!person) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  const occupancies = listWhere('occupancies', (o) => o.personId === person.id).map((o) => ({
    ...o,
    unit: findById('units', o.unitId),
    tower: findById('towers', findById('units', o.unitId)?.towerId)
  }));
  renderPage(req, res, 'people/occupancies', { title: `${person.fullName} - Ocupaciones`, person, occupancies });
});

demoRoutes.get('/app/gastos-comunes', (req, res) => {
  const user = req.session.user;
  const periods = getStore().periods.map((p) => {
    const charges = listWhere('charges', (c) => c.periodId === p.id);
    const total = charges.reduce((s, c) => s + c.totalAmount, 0);
    const paid = charges.reduce((s, c) => s + c.paidAmount, 0);
    return { ...p, total, paid, percent: total === 0 ? 0 : Math.round((paid / total) * 100) };
  }).filter(() => {
    if (user.isCondominiumAdmin) return true;
    return user.towerIds.length > 0;
  });
  renderPage(req, res, 'expenses/index', { title: 'Gastos comunes', items: periods });
});

demoRoutes.get('/app/gastos-comunes/nuevo', (req, res) => {
  const user = req.session.user;
  if (!user.roleCodes?.includes(ROLES.ACCOUNTANT) && !user.isCondominiumAdmin) return res.status(403).render('errors/403', { title: 'Acceso denegado', message: 'Permisos insuficientes' });
  renderPage(req, res, 'expenses/form', {
    title: 'Nuevo periodo',
    item: { monthName: 'Enero', year: new Date().getFullYear(), dueDate: datePlusDaysISO(15), totalAmount: 0 },
    formAction: '/app/gastos-comunes/nuevo',
    cancelHref: '/app/gastos-comunes',
    months: ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'],
    errors: {}
  });
});

demoRoutes.post('/app/gastos-comunes/nuevo', (req, res) => {
  const user = req.session.user;
  if (!user.roleCodes?.includes(ROLES.ACCOUNTANT) && !user.isCondominiumAdmin) return res.status(403).render('errors/403', { title: 'Acceso denegado', message: 'Permisos insuficientes' });
  const body = readBody(req);
  const errors = {};
  const totalAmount = Number(body.totalAmount);
  if (!Number.isFinite(totalAmount) || totalAmount <= 0) errors.totalAmount = 'Debe ser mayor a 0';
  const year = Number(body.year);
  if (!Number.isFinite(year)) errors.year = 'Invalido';
  if (Object.keys(errors).length) {
    return renderPage(req, res, 'expenses/form', {
      title: 'Nuevo periodo',
      item: body,
      formAction: '/app/gastos-comunes/nuevo',
      cancelHref: '/app/gastos-comunes',
      months: ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'],
      errors
    });
  }
  const monthIndex = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'].indexOf(body.month);
  const id = nextId('per');
  insert('periods', {
    id,
    condominiumId: user.condominiumId,
    year,
    month: monthIndex + 1,
    monthName: body.month,
    status: 'draft',
    issueDate: todayISO(),
    dueDate: body.dueDate || datePlusDaysISO(15),
    totalAmount,
    notes: body.notes || '',
    issuedAt: null,
    closedAt: null
  });
  flash(req, 'success', 'Periodo creado en borrador');
  recordAudit(req, 'expenses.create', 'period', id, 'Periodo en borrador');
  res.redirect(`/app/gastos-comunes/${id}/editar`);
});

demoRoutes.get('/app/gastos-comunes/:periodId', (req, res) => {
  const period = findById('periods', req.params.periodId);
  if (!period) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  const charges = listWhere('charges', (c) => c.periodId === period.id).map((c) => ({
    ...c,
    unit: findById('units', c.unitId),
    tower: findById('towers', findById('units', c.unitId)?.towerId)
  }));
  renderPage(req, res, 'expenses/show', { title: `${period.monthName} ${period.year}`, period, charges });
});

demoRoutes.get('/app/gastos-comunes/:periodId/editar', (req, res) => {
  const user = req.session.user;
  if (!user.roleCodes?.includes(ROLES.ACCOUNTANT) && !user.isCondominiumAdmin) return res.status(403).render('errors/403', { title: 'Acceso denegado', message: 'Permisos insuficientes' });
  const period = findById('periods', req.params.periodId);
  if (!period) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  const body = { ...period, month: period.monthName };
  renderPage(req, res, 'expenses/form', {
    title: `Editar ${period.monthName} ${period.year}`,
    item: body,
    formAction: `/app/gastos-comunes/${period.id}/editar`,
    cancelHref: `/app/gastos-comunes/${period.id}`,
    months: ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'],
    errors: {}
  });
});

demoRoutes.post('/app/gastos-comunes/:periodId/editar', (req, res) => {
  const user = req.session.user;
  if (!user.roleCodes?.includes(ROLES.ACCOUNTANT) && !user.isCondominiumAdmin) return res.status(403).render('errors/403', { title: 'Acceso denegado', message: 'Permisos insuficientes' });
  const period = findById('periods', req.params.periodId);
  if (!period) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  if (period.status !== 'draft') return bad(res, 'Solo periodos en borrador se editan');
  const body = readBody(req);
  const monthIndex = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'].indexOf(body.month);
  const year = Number(body.year) || period.year;
  const totalAmount = Number(body.totalAmount) || period.totalAmount;
  update('periods', period.id, {
    monthName: body.month || period.monthName,
    month: monthIndex + 1,
    year,
    dueDate: body.dueDate || period.dueDate,
    totalAmount
  });
  flash(req, 'success', 'Periodo actualizado');
  recordAudit(req, 'expenses.update', 'period', period.id, 'Periodo actualizado');
  res.redirect(`/app/gastos-comunes/${period.id}`);
});

demoRoutes.get('/app/gastos-comunes/:periodId/gastos', (req, res) => {
  const period = findById('periods', req.params.periodId);
  if (!period) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  renderPage(req, res, 'expenses/items', { title: `Gastos - ${period.monthName}`, period, categories: getStore().expenseCategories });
});

demoRoutes.get('/app/gastos-comunes/:periodId/cargos', (req, res) => {
  const period = findById('periods', req.params.periodId);
  if (!period) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  const charges = listWhere('charges', (c) => c.periodId === period.id).map((c) => ({
    ...c,
    unit: findById('units', c.unitId),
    tower: findById('towers', findById('units', c.unitId)?.towerId)
  }));
  renderPage(req, res, 'expenses/charges', { title: `Cargos - ${period.monthName}`, period, charges });
});

demoRoutes.post('/app/gastos-comunes/:periodId/emitir', (req, res) => {
  const user = req.session.user;
  if (!user.roleCodes?.includes(ROLES.ACCOUNTANT) && !user.isCondominiumAdmin) return res.status(403).render('errors/403', { title: 'Acceso denegado', message: 'Permisos insuficientes' });
  const period = findById('periods', req.params.periodId);
  if (!period) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  if (period.status !== 'draft') return bad(res, 'Solo periodos en borrador se emiten');
  const units = listWhere('units', (u) => u.condominiumId === period.condominiumId);
  for (const u of units) {
    const base = Math.round(period.totalAmount / units.length);
    insert('charges', {
      id: nextId('cha'),
      periodId: period.id,
      unitId: u.id,
      baseAmount: base,
      previousBalance: 0,
      finesAmount: 0,
      interestAmount: 0,
      discountAmount: 0,
      totalAmount: base,
      paidAmount: 0,
      balanceAmount: base,
      status: 'pending',
      dueDate: period.dueDate
    });
  }
  update('periods', period.id, { status: 'issued', issuedAt: todayISO() });
  flash(req, 'success', 'Periodo emitido');
  recordAudit(req, 'expenses.issue', 'period', period.id, 'Cargos generados');
  res.redirect(`/app/gastos-comunes/${period.id}`);
});

demoRoutes.post('/app/gastos-comunes/:periodId/cerrar', (req, res) => {
  const user = req.session.user;
  if (!user.roleCodes?.includes(ROLES.ACCOUNTANT) && !user.isCondominiumAdmin) return res.status(403).render('errors/403', { title: 'Acceso denegado', message: 'Permisos insuficientes' });
  const period = findById('periods', req.params.periodId);
  if (!period) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  if (period.status !== 'issued') return bad(res, 'Solo periodos emitidos se cierran');
  update('periods', period.id, { status: 'closed', closedAt: todayISO() });
  flash(req, 'success', 'Periodo cerrado');
  recordAudit(req, 'expenses.close', 'period', period.id, 'Periodo cerrado');
  res.redirect(`/app/gastos-comunes/${period.id}`);
});

demoRoutes.get('/app/pagos', (req, res) => {
  const user = req.session.user;
  const items = filterPaymentsForUser(user).map((p) => ({
    ...p,
    unit: findById('units', p.unitId),
    tower: findById('towers', findById('units', p.unitId)?.towerId),
    person: findById('people', p.payerPersonId)
  }));
  renderPage(req, res, 'payments/index', { title: 'Pagos', items });
});

demoRoutes.get('/app/pagos/nuevo', (req, res) => {
  const user = req.session.user;
  const units = filterUnitsForUser(user);
  const people = filterPeopleForUser(user);
  renderPage(req, res, 'payments/form', {
    title: 'Registrar pago',
    units,
    people,
    item: { paymentMethod: 'transfer', paidAt: todayISO() },
    formAction: '/app/pagos/nuevo',
    cancelHref: '/app/pagos',
    errors: {}
  });
});

demoRoutes.post('/app/pagos/nuevo', (req, res) => {
  const user = req.session.user;
  const body = readBody(req);
  const errors = {};
  if (!body.unitId) errors.unitId = 'Requerido';
  if (!body.payerPersonId) errors.payerPersonId = 'Requerido';
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) errors.amount = 'Debe ser mayor a 0';
  if (!userCanAccessUnit(user, body.unitId)) return res.status(403).render('errors/403', { title: 'Acceso denegado', message: 'Unidad fuera de alcance' });
  if (Object.keys(errors).length) {
    return renderPage(req, res, 'payments/form', {
      title: 'Registrar pago',
      units: filterUnitsForUser(user),
      people: filterPeopleForUser(user),
      item: body,
      formAction: '/app/pagos/nuevo',
      cancelHref: '/app/pagos',
      errors
    });
  }
  const unit = findById('units', body.unitId);
  const id = nextId('pay');
  insert('payments', {
    id,
    condominiumId: unit.condominiumId,
    unitId: body.unitId,
    payerPersonId: body.payerPersonId,
    amount,
    paymentMethod: ['transfer', 'cash', 'check'].includes(body.paymentMethod) ? body.paymentMethod : 'transfer',
    reference: body.reference || '',
    paidAt: body.paidAt || todayISO(),
    status: 'pending_verification',
    receiptPath: null,
    recordedBy: user.id,
    verifiedBy: null,
    verifiedAt: null,
    reversalReason: null
  });
  flash(req, 'success', 'Pago registrado, pendiente de verificacion');
  recordAudit(req, 'payments.create', 'payment', id, `Pago $${amount}`);
  res.redirect(`/app/pagos/${id}`);
});

demoRoutes.get('/app/pagos/:paymentId', (req, res) => {
  const user = req.session.user;
  if (!userCanAccessUnit(user, findById('payments', req.params.paymentId)?.unitId) && !user.isCondominiumAdmin && !user.roleCodes?.includes(ROLES.ACCOUNTANT)) return res.status(403).render('errors/403', { title: 'Acceso denegado', message: 'Pago fuera de alcance' });
  const payment = findById('payments', req.params.paymentId);
  if (!payment) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  const unit = findById('units', payment.unitId);
  const person = findById('people', payment.payerPersonId);
  renderPage(req, res, 'payments/show', {
    title: `Pago ${payment.reference || payment.id}`,
    item: payment,
    unit,
    person,
    user
  });
});

demoRoutes.post('/app/pagos/:paymentId/verificar', (req, res) => {
  const user = req.session.user;
  if (!user.roleCodes?.includes(ROLES.ACCOUNTANT) && !user.isCondominiumAdmin) return res.status(403).render('errors/403', { title: 'Acceso denegado', message: 'Permisos insuficientes' });
  const payment = findById('payments', req.params.paymentId);
  if (!payment) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  if (payment.status !== 'pending_verification') return bad(res, 'Pago no esta pendiente');
  let remaining = payment.amount;
  const charges = listWhere('charges', (c) => c.unitId === payment.unitId && c.balanceAmount > 0).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  for (const ch of charges) {
    if (remaining <= 0) break;
    const pay = Math.min(remaining, ch.balanceAmount);
    const newPaid = ch.paidAmount + pay;
    const newBalance = ch.totalAmount - newPaid;
    let newStatus = ch.status;
    if (newBalance <= 0) newStatus = 'paid';
    update('charges', ch.id, {
      paidAmount: newPaid,
      balanceAmount: newBalance,
      status: newStatus
    });
    remaining -= pay;
  }
  update('payments', payment.id, {
    status: 'verified',
    verifiedBy: user.id,
    verifiedAt: todayISO()
  });
  flash(req, 'success', 'Pago verificado y aplicado');
  recordAudit(req, 'payments.verify', 'payment', payment.id, 'Pago verificado');
  res.redirect(`/app/pagos/${payment.id}`);
});

demoRoutes.post('/app/pagos/:paymentId/rechazar', (req, res) => {
  const user = req.session.user;
  if (!user.roleCodes?.includes(ROLES.ACCOUNTANT) && !user.isCondominiumAdmin) return res.status(403).render('errors/403', { title: 'Acceso denegado', message: 'Permisos insuficientes' });
  const payment = findById('payments', req.params.paymentId);
  if (!payment) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  if (payment.status !== 'pending_verification') return bad(res, 'Pago no esta pendiente');
  const body = readBody(req);
  if (!body.reason) return bad(res, 'Motivo requerido');
  update('payments', payment.id, { status: 'rejected', reversalReason: body.reason });
  flash(req, 'success', 'Pago rechazado');
  recordAudit(req, 'payments.reject', 'payment', payment.id, body.reason);
  res.redirect(`/app/pagos/${payment.id}`);
});

demoRoutes.post('/app/pagos/:paymentId/reversar', (req, res) => {
  const user = req.session.user;
  if (!user.roleCodes?.includes(ROLES.ACCOUNTANT) && !user.isCondominiumAdmin) return res.status(403).render('errors/403', { title: 'Acceso denegado', message: 'Permisos insuficientes' });
  const payment = findById('payments', req.params.paymentId);
  if (!payment) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  if (payment.status !== 'verified') return bad(res, 'Solo se reversan pagos verificados');
  const body = readBody(req);
  if (!body.reason) return bad(res, 'Motivo obligatorio');
  const charges = listWhere('charges', (c) => c.unitId === payment.unitId && c.paidAmount > 0).sort((a, b) => b.dueDate.localeCompare(a.dueDate));
  let remaining = payment.amount;
  for (const ch of charges) {
    if (remaining <= 0) break;
    const reduce = Math.min(remaining, ch.paidAmount);
    const newPaid = ch.paidAmount - reduce;
    const newBalance = ch.totalAmount - newPaid;
    let newStatus = ch.status;
    if (newBalance > 0 && newStatus === 'paid') newStatus = 'pending';
    update('charges', ch.id, {
      paidAmount: newPaid,
      balanceAmount: newBalance,
      status: newStatus
    });
    remaining -= reduce;
  }
  update('payments', payment.id, { status: 'reversed', reversalReason: body.reason });
  flash(req, 'success', 'Pago reversado');
  recordAudit(req, 'payments.reverse', 'payment', payment.id, body.reason);
  res.redirect(`/app/pagos/${payment.id}`);
});

demoRoutes.get('/app/morosidad', (req, res) => {
  const user = req.session.user;
  const towers = filterTowersForUser(user);
  const items = towers.map((t) => {
    const units = listWhere('units', (u) => u.towerId === t.id);
    const charges = listWhere('charges', (c) => units.map((u) => u.id).includes(c.unitId));
    const total = charges.reduce((s, c) => s + c.totalAmount, 0);
    const paid = charges.reduce((s, c) => s + c.paidAmount, 0);
    const balance = total - paid;
    const overdue = charges.filter((c) => c.status === 'overdue').length;
    return { tower: t, total, paid, balance, percent: total === 0 ? 0 : Math.round((balance / total) * 100), overdueUnits: overdue };
  });
  renderPage(req, res, 'delinquency/index', { title: 'Morosidad', items });
});

demoRoutes.get('/app/morosidad/torres', (req, res) => {
  const user = req.session.user;
  const towers = filterTowersForUser(user);
  const items = towers.map((t) => {
    const units = listWhere('units', (u) => u.towerId === t.id);
    const unitBalances = units.map((u) => {
      const charges = listWhere('charges', (c) => c.unitId === u.id);
      const balance = charges.reduce((s, c) => s + c.balanceAmount, 0);
      const occupant = listWhere('occupancies', (o) => o.unitId === u.id && o.endsOn === null && o.isPrimary)[0];
      return { unit: u, balance, person: occupant ? findById('people', occupant.personId) : null };
    }).filter((row) => row.balance > 0);
    return { tower: t, units: unitBalances };
  });
  renderPage(req, res, 'delinquency/towers', { title: 'Morosidad por torre', items });
});

demoRoutes.get('/app/morosidad/unidades', (req, res) => {
  const user = req.session.user;
  const items = filterUnitsForUser(user).map((u) => {
    const charges = listWhere('charges', (c) => c.unitId === u.id);
    const balance = charges.reduce((s, c) => s + c.balanceAmount, 0);
    const occupant = listWhere('occupancies', (o) => o.unitId === u.id && o.endsOn === null && o.isPrimary)[0];
    return { ...u, tower: findById('towers', u.towerId), balance, person: occupant ? findById('people', occupant.personId) : null };
  }).filter((u) => u.balance > 0);
  renderPage(req, res, 'delinquency/units', { title: 'Morosidad por unidad', items });
});

demoRoutes.get('/app/morosidad/csv', (req, res) => {
  const user = req.session.user;
  const items = filterUnitsForUser(user).map((u) => {
    const charges = listWhere('charges', (c) => c.unitId === u.id);
    const balance = charges.reduce((s, c) => s + c.balanceAmount, 0);
    const occupant = listWhere('occupancies', (o) => o.unitId === u.id && o.endsOn === null && o.isPrimary)[0];
    const tower = findById('towers', u.towerId);
    return { tower: tower?.name || '-', unit: u.number, person: occupant ? findById('people', occupant.personId)?.fullName : '-', balance };
  }).filter((u) => u.balance > 0);
  const rows = [['Torre', 'Unidad', 'Ocupante', 'Saldo']];
  for (const r of items) rows.push([r.tower, r.unit, r.person, Math.round(r.balance / 1000)]);
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="morosidad-${todayISO()}.csv"`);
  res.send(csv);
});

demoRoutes.get('/app/multas', (req, res) => {
  const user = req.session.user;
  const items = filterFinesForUser(user).map((f) => ({
    ...f,
    unit: findById('units', f.unitId),
    person: findById('people', f.personId)
  }));
  renderPage(req, res, 'fines/index', { title: 'Multas', items });
});

demoRoutes.get('/app/multas/nueva', (req, res) => {
  const user = req.session.user;
  const units = filterUnitsForUser(user);
  const people = filterPeopleForUser(user);
  renderPage(req, res, 'fines/form', {
    title: 'Nueva multa',
    units,
    people,
    item: { status: 'draft', ruleCode: 'RUIDO', incidentAt: todayISO(), amount: 0, reason: '' },
    formAction: '/app/multas/nueva',
    cancelHref: '/app/multas',
    errors: {}
  });
});

demoRoutes.post('/app/multas/nueva', (req, res) => {
  const user = req.session.user;
  if (!user.roleCodes?.includes(ROLES.CONDOMINIUM_ADMIN) && !user.roleCodes?.includes(ROLES.TOWER_ADMIN) && !user.roleCodes?.includes(ROLES.CONCIERGE)) return res.status(403).render('errors/403', { title: 'Acceso denegado', message: 'Permisos insuficientes' });
  const body = readBody(req);
  const errors = {};
  if (!body.unitId) errors.unitId = 'Requerido';
  if (!body.reason) errors.reason = 'Requerido';
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) errors.amount = 'Debe ser mayor a 0';
  if (Object.keys(errors).length) {
    return renderPage(req, res, 'fines/form', {
      title: 'Nueva multa',
      units: filterUnitsForUser(user),
      people: filterPeopleForUser(user),
      item: body,
      formAction: '/app/multas/nueva',
      cancelHref: '/app/multas',
      errors
    });
  }
  const unit = findById('units', body.unitId);
  const id = nextId('fin');
  insert('fines', {
    id,
    condominiumId: unit.condominiumId,
    unitId: body.unitId,
    personId: body.personId || null,
    ruleCode: body.ruleCode || 'OTRO',
    reason: body.reason,
    incidentAt: body.incidentAt || todayISO(),
    amount,
    status: 'draft',
    notes: body.notes || '',
    createdBy: user.id,
    notifiedAt: null,
    resolvedAt: null
  });
  flash(req, 'success', 'Multa creada en borrador');
  recordAudit(req, 'fines.create', 'fine', id, 'Multa en borrador');
  res.redirect(`/app/multas/${id}/editar`);
});

demoRoutes.get('/app/multas/:fineId', (req, res) => {
  const user = req.session.user;
  const fine = findById('fines', req.params.fineId);
  if (!fine) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  if (!userCanAccessUnit(user, fine.unitId) && !user.isCondominiumAdmin) return res.status(403).render('errors/403', { title: 'Acceso denegado', message: 'Multa fuera de alcance' });
  const unit = findById('units', fine.unitId);
  const person = findById('people', fine.personId);
  const canVerify = user.isCondominiumAdmin || (user.roleCodes ?? []).includes(ROLES.TOWER_ADMIN);
  const canAppeal = !canVerify && userCanAccessUnit(user, fine.unitId) && ['notified'].includes(fine.status);
  renderPage(req, res, 'fines/show', { title: `Multa ${fine.ruleCode}`, item: fine, unit, person, user, canVerify, canAppeal });
});

demoRoutes.get('/app/multas/:fineId/editar', (req, res) => {
  const user = req.session.user;
  if (!user.roleCodes?.includes(ROLES.CONDOMINIUM_ADMIN) && !user.roleCodes?.includes(ROLES.TOWER_ADMIN)) return res.status(403).render('errors/403', { title: 'Acceso denegado', message: 'Permisos insuficientes' });
  const fine = findById('fines', req.params.fineId);
  if (!fine) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  renderPage(req, res, 'fines/form', {
    title: `Editar multa ${fine.ruleCode}`,
    item: fine,
    units: filterUnitsForUser(user),
    people: filterPeopleForUser(user),
    formAction: `/app/multas/${fine.id}/editar`,
    cancelHref: `/app/multas/${fine.id}`,
    errors: {}
  });
});

demoRoutes.post('/app/multas/:fineId/editar', (req, res) => {
  const user = req.session.user;
  if (!user.roleCodes?.includes(ROLES.CONDOMINIUM_ADMIN) && !user.roleCodes?.includes(ROLES.TOWER_ADMIN)) return res.status(403).render('errors/403', { title: 'Acceso denegado', message: 'Permisos insuficientes' });
  const fine = findById('fines', req.params.fineId);
  if (!fine) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  if (fine.status !== 'draft') return bad(res, 'Solo borradores se editan');
  const body = readBody(req);
  const amount = Number(body.amount) || fine.amount;
  update('fines', fine.id, {
    unitId: body.unitId || fine.unitId,
    personId: body.personId || fine.personId,
    ruleCode: body.ruleCode || fine.ruleCode,
    reason: body.reason || fine.reason,
    incidentAt: body.incidentAt || fine.incidentAt,
    amount,
    notes: body.notes || fine.notes
  });
  flash(req, 'success', 'Multa actualizada');
  recordAudit(req, 'fines.update', 'fine', fine.id, 'Multa actualizada');
  res.redirect(`/app/multas/${fine.id}`);
});

demoRoutes.post('/app/multas/:fineId/notificar', (req, res) => {
  const user = req.session.user;
  if (!user.roleCodes?.includes(ROLES.CONDOMINIUM_ADMIN) && !user.roleCodes?.includes(ROLES.TOWER_ADMIN)) return res.status(403).render('errors/403', { title: 'Acceso denegado', message: 'Permisos insuficientes' });
  const fine = findById('fines', req.params.fineId);
  if (!fine) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  if (!['draft', 'notified'].includes(fine.status)) return bad(res, 'Estado no valido para notificar');
  update('fines', fine.id, { status: 'notified', notifiedAt: todayISO() });
  flash(req, 'success', 'Multa notificada');
  recordAudit(req, 'fines.notify', 'fine', fine.id, 'Multa notificada');
  res.redirect(`/app/multas/${fine.id}`);
});

demoRoutes.post('/app/multas/:fineId/confirmar', (req, res) => {
  const user = req.session.user;
  if (!user.roleCodes?.includes(ROLES.CONDOMINIUM_ADMIN) && !user.roleCodes?.includes(ROLES.TOWER_ADMIN)) return res.status(403).render('errors/403', { title: 'Acceso denegado', message: 'Permisos insuficientes' });
  const fine = findById('fines', req.params.fineId);
  if (!fine) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  if (fine.status !== 'notified') return bad(res, 'Multa no notificada');
  update('fines', fine.id, { status: 'confirmed' });
  const unit = findById('units', fine.unitId);
  if (unit) {
    insert('charges', {
      id: nextId('cha'),
      periodId: null,
      unitId: unit.id,
      baseAmount: fine.amount,
      previousBalance: 0,
      finesAmount: fine.amount,
      interestAmount: 0,
      discountAmount: 0,
      totalAmount: fine.amount,
      paidAmount: 0,
      balanceAmount: fine.amount,
      status: 'pending',
      dueDate: datePlusDaysISO(15)
    });
  }
  flash(req, 'success', 'Multa confirmada y agregada a cargos');
  recordAudit(req, 'fines.confirm', 'fine', fine.id, 'Multa confirmada');
  res.redirect(`/app/multas/${fine.id}`);
});

demoRoutes.post('/app/multas/:fineId/anular', (req, res) => {
  const user = req.session.user;
  if (!user.roleCodes?.includes(ROLES.CONDOMINIUM_ADMIN) && !user.roleCodes?.includes(ROLES.TOWER_ADMIN)) return res.status(403).render('errors/403', { title: 'Acceso denegado', message: 'Permisos insuficientes' });
  const fine = findById('fines', req.params.fineId);
  if (!fine) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  const body = readBody(req);
  if (!body.reason) return bad(res, 'Motivo obligatorio');
  update('fines', fine.id, { status: 'void', notes: `${fine.notes || ''}\nAnulacion: ${body.reason}`, resolvedAt: todayISO() });
  flash(req, 'success', 'Multa anulada');
  recordAudit(req, 'fines.void', 'fine', fine.id, body.reason);
  res.redirect(`/app/multas/${fine.id}`);
});

demoRoutes.post('/app/multas/:fineId/apelar', (req, res) => {
  const user = req.session.user;
  const fine = findById('fines', req.params.fineId);
  if (!fine) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  if (!userCanAccessUnit(user, fine.unitId) && !user.isCondominiumAdmin) return res.status(403).render('errors/403', { title: 'Acceso denegado', message: 'Multa fuera de alcance' });
  const body = readBody(req);
  if (!body.reason) return bad(res, 'Motivo requerido');
  update('fines', fine.id, { status: 'appealed', notes: `${fine.notes || ''}\nApelacion: ${body.reason}` });
  flash(req, 'success', 'Apelacion registrada');
  recordAudit(req, 'fines.appeal', 'fine', fine.id, body.reason);
  res.redirect(`/app/multas/${fine.id}`);
});

demoRoutes.get('/app/mantenimientos', (req, res) => {
  const user = req.session.user;
  const items = filterMaintenanceForUser(user).map((m) => ({
    ...m,
    unit: findById('units', m.unitId),
    tower: findById('towers', findById('units', m.unitId)?.towerId),
    assignee: m.assignedTo ? findById('users', m.assignedTo) : null
  }));
  renderPage(req, res, 'maintenance/index', { title: 'Mantenimientos', items });
});

demoRoutes.get('/app/mantenimientos/nuevo', (req, res) => {
  const user = req.session.user;
  const units = filterUnitsForUser(user);
  renderPage(req, res, 'maintenance/form', {
    title: 'Nueva solicitud',
    units,
    item: { priority: 'normal', status: 'new' },
    formAction: '/app/mantenimientos/nuevo',
    cancelHref: '/app/mantenimientos',
    errors: {}
  });
});

demoRoutes.post('/app/mantenimientos/nuevo', (req, res) => {
  const user = req.session.user;
  const body = readBody(req);
  const errors = {};
  if (!body.unitId) errors.unitId = 'Requerido';
  if (!body.title) errors.title = 'Requerido';
  if (!userCanAccessUnit(user, body.unitId)) return res.status(403).render('errors/403', { title: 'Acceso denegado', message: 'Unidad fuera de alcance' });
  if (Object.keys(errors).length) {
    return renderPage(req, res, 'maintenance/form', {
      title: 'Nueva solicitud',
      units: filterUnitsForUser(user),
      item: body,
      formAction: '/app/mantenimientos/nuevo',
      cancelHref: '/app/mantenimientos',
      errors
    });
  }
  const id = nextId('mnt');
  insert('maintenance', {
    id,
    condominiumId: user.condominiumId,
    unitId: body.unitId,
    createdBy: user.id,
    assignedTo: null,
    category: body.category || 'general',
    priority: ['low', 'normal', 'high', 'urgent'].includes(body.priority) ? body.priority : 'normal',
    title: body.title,
    description: body.description || '',
    status: 'new',
    scheduledFor: body.scheduledFor || null,
    history: [{ from: null, to: 'new', at: todayISO(), by: user.id }],
    completedAt: null,
    closedAt: null
  });
  flash(req, 'success', 'Solicitud creada');
  recordAudit(req, 'maintenance.create', 'maintenance', id, 'Solicitud creada');
  res.redirect(`/app/mantenimientos/${id}`);
});

demoRoutes.get('/app/mantenimientos/:requestId', (req, res) => {
  const user = req.session.user;
  const item = findById('maintenance', req.params.requestId);
  if (!item) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  if (!userCanAccessUnit(user, item.unitId) && !user.isCondominiumAdmin && !user.roleCodes?.includes(ROLES.TOWER_ADMIN)) return res.status(403).render('errors/403', { title: 'Acceso denegado', message: 'Solicitud fuera de alcance' });
  const unit = findById('units', item.unitId);
  const tower = findById('towers', unit?.towerId);
  const assignee = item.assignedTo ? findById('users', item.assignedTo) : null;
  const canManage = user.isCondominiumAdmin || (user.roleCodes ?? []).includes(ROLES.TOWER_ADMIN);
  const comments = getStore().maintenanceComments.filter((c) => c.maintenanceId === item.id);
  renderPage(req, res, 'maintenance/show', {
    title: item.title,
    item,
    unit,
    tower,
    assignee,
    history: item.history || [],
    comments,
    canManage
  });
});

demoRoutes.get('/app/mantenimientos/:requestId/editar', (req, res) => {
  const user = req.session.user;
  if (!user.isCondominiumAdmin && !user.roleCodes?.includes(ROLES.TOWER_ADMIN)) return res.status(403).render('errors/403', { title: 'Acceso denegado', message: 'Permisos insuficientes' });
  const item = findById('maintenance', req.params.requestId);
  if (!item) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  renderPage(req, res, 'maintenance/form', {
    title: `Editar ${item.title}`,
    item,
    units: filterUnitsForUser(user),
    formAction: `/app/mantenimientos/${item.id}/editar`,
    cancelHref: `/app/mantenimientos/${item.id}`,
    errors: {}
  });
});

demoRoutes.post('/app/mantenimientos/:requestId/editar', (req, res) => {
  const user = req.session.user;
  if (!user.isCondominiumAdmin && !user.roleCodes?.includes(ROLES.TOWER_ADMIN)) return res.status(403).render('errors/403', { title: 'Acceso denegado', message: 'Permisos insuficientes' });
  const item = findById('maintenance', req.params.requestId);
  if (!item) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  const body = readBody(req);
  update('maintenance', item.id, {
    unitId: body.unitId || item.unitId,
    title: body.title || item.title,
    description: body.description || item.description,
    category: body.category || item.category,
    priority: ['low', 'normal', 'high', 'urgent'].includes(body.priority) ? body.priority : item.priority,
    scheduledFor: body.scheduledFor || item.scheduledFor
  });
  flash(req, 'success', 'Solicitud actualizada');
  recordAudit(req, 'maintenance.update', 'maintenance', item.id, 'Solicitud editada');
  res.redirect(`/app/mantenimientos/${item.id}`);
});

demoRoutes.get('/app/mantenimientos/:requestId/asignar', (req, res) => {
  const user = req.session.user;
  if (!user.isCondominiumAdmin && !user.roleCodes?.includes(ROLES.TOWER_ADMIN)) return res.status(403).render('errors/403', { title: 'Acceso denegado', message: 'Permisos insuficientes' });
  const item = findById('maintenance', req.params.requestId);
  if (!item) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  const candidates = getStore().users.filter((u) => (u.roleCodes ?? []).some((r) => [ROLES.TOWER_ADMIN, ROLES.TOWER_TEAM].includes(r)));
  renderPage(req, res, 'maintenance/assign', {
    title: 'Asignar solicitud',
    item,
    users: candidates,
    formAction: `/app/mantenimientos/${item.id}/asignar`,
    cancelHref: `/app/mantenimientos/${item.id}`
  });
});

demoRoutes.post('/app/mantenimientos/:requestId/asignar', (req, res) => {
  const user = req.session.user;
  if (!user.isCondominiumAdmin && !user.roleCodes?.includes(ROLES.TOWER_ADMIN)) return res.status(403).render('errors/403', { title: 'Acceso denegado', message: 'Permisos insuficientes' });
  const item = findById('maintenance', req.params.requestId);
  if (!item) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  const body = readBody(req);
  if (!body.userId) return bad(res, 'Selecciona responsable');
  const previous = item.status;
  update('maintenance', item.id, {
    assignedTo: body.userId,
    status: 'assigned',
    history: [...(item.history || []), { from: previous, to: 'assigned', at: todayISO(), by: user.id }]
  });
  flash(req, 'success', 'Solicitud asignada');
  recordAudit(req, 'maintenance.assign', 'maintenance', item.id, 'Asignada');
  res.redirect(`/app/mantenimientos/${item.id}`);
});

demoRoutes.post('/app/mantenimientos/:requestId/estado', (req, res) => {
  const user = req.session.user;
  const item = findById('maintenance', req.params.requestId);
  if (!item) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  if (!userCanAccessUnit(user, item.unitId) && !user.isCondominiumAdmin && !user.roleCodes?.includes(ROLES.TOWER_ADMIN)) return res.status(403).render('errors/403', { title: 'Acceso denegado', message: 'Solicitud fuera de alcance' });
  const body = readBody(req);
  const next = body.status;
  if (!['new', 'assigned', 'in_progress', 'in_review', 'completed', 'cancelled'].includes(next)) return bad(res, 'Estado invalido');
  const previous = item.status;
  const completedAt = next === 'completed' ? todayISO() : item.completedAt;
  const closedAt = next === 'cancelled' ? todayISO() : item.closedAt;
  update('maintenance', item.id, {
    status: next,
    completedAt,
    closedAt,
    history: [...(item.history || []), { from: previous, to: next, at: todayISO(), by: user.id }]
  });
  flash(req, 'success', 'Estado actualizado');
  recordAudit(req, 'maintenance.status', 'maintenance', item.id, `${previous} -> ${next}`);
  res.redirect(`/app/mantenimientos/${item.id}`);
});

demoRoutes.post('/app/mantenimientos/:requestId/comentarios', (req, res) => {
  const user = req.session.user;
  const item = findById('maintenance', req.params.requestId);
  if (!item) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  if (!userCanAccessUnit(user, item.unitId) && !user.isCondominiumAdmin && !user.roleCodes?.includes(ROLES.TOWER_ADMIN)) return res.status(403).render('errors/403', { title: 'Acceso denegado', message: 'Solicitud fuera de alcance' });
  const body = readBody(req);
  if (!body.message) return bad(res, 'Mensaje requerido');
  const comments = getStore().maintenanceComments;
  comments.push({
    id: nextId('mco'),
    maintenanceId: item.id,
    authorId: user.id,
    authorName: user.fullName,
    message: body.message,
    isInternal: body.isInternal === 'on',
    createdAt: todayISO()
  });
  flash(req, 'success', 'Comentario agregado');
  recordAudit(req, 'maintenance.comment', 'maintenance', item.id, 'Comentario');
  res.redirect(`/app/mantenimientos/${item.id}`);
});

demoRoutes.get('/app/encomiendas', (req, res) => {
  const user = req.session.user;
  const items = filterParcelsForUser(user).map((p) => ({
    ...p,
    unit: findById('units', p.unitId),
    recipient: findById('people', p.recipientPersonId)
  }));
  renderPage(req, res, 'parcels/index', { title: 'Encomiendas', items });
});

demoRoutes.get('/app/encomiendas/nueva', (req, res) => {
  const user = req.session.user;
  const units = filterUnitsForUser(user);
  const people = filterPeopleForUser(user);
  renderPage(req, res, 'parcels/form', {
    title: 'Nueva encomienda',
    units,
    people,
    item: { carrier: 'Starken', receivedAt: todayISO(), status: 'received' },
    formAction: '/app/encomiendas/nueva',
    cancelHref: '/app/encomiendas',
    errors: {}
  });
});

demoRoutes.post('/app/encomiendas/nueva', (req, res) => {
  const user = req.session.user;
  const body = readBody(req);
  const errors = {};
  if (!body.unitId) errors.unitId = 'Requerido';
  if (!body.recipientPersonId) errors.recipientPersonId = 'Requerido';
  if (!userCanAccessUnit(user, body.unitId)) return res.status(403).render('errors/403', { title: 'Acceso denegado', message: 'Unidad fuera de alcance' });
  if (Object.keys(errors).length) {
    return renderPage(req, res, 'parcels/form', {
      title: 'Nueva encomienda',
      units: filterUnitsForUser(user),
      people: filterPeopleForUser(user),
      item: body,
      formAction: '/app/encomiendas/nueva',
      cancelHref: '/app/encomiendas',
      errors
    });
  }
  const unit = findById('units', body.unitId);
  const id = nextId('par');
  insert('parcels', {
    id,
    condominiumId: unit.condominiumId,
    unitId: body.unitId,
    recipientPersonId: body.recipientPersonId,
    carrier: body.carrier || 'Starken',
    trackingNumber: body.trackingNumber || '',
    description: body.description || '',
    receivedBy: user.id,
    receivedAt: body.receivedAt || todayISO(),
    notifiedAt: null,
    deliveredBy: null,
    deliveredToName: null,
    deliveredAt: null,
    status: 'received',
    proofPath: null
  });
  flash(req, 'success', 'Encomienda registrada');
  recordAudit(req, 'parcels.create', 'parcel', id, 'Encomienda registrada');
  res.redirect(`/app/encomiendas/${id}`);
});

demoRoutes.get('/app/encomiendas/:parcelId', (req, res) => {
  const user = req.session.user;
  const item = findById('parcels', req.params.parcelId);
  if (!item) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  if (!userCanAccessUnit(user, item.unitId) && !user.isCondominiumAdmin) return res.status(403).render('errors/403', { title: 'Acceso denegado', message: 'Encomienda fuera de alcance' });
  const unit = findById('units', item.unitId);
  const recipient = findById('people', item.recipientPersonId);
  const canManage = user.isCondominiumAdmin || (user.roleCodes ?? []).includes(ROLES.CONCIERGE);
  renderPage(req, res, 'parcels/show', {
    title: `Encomienda ${item.trackingNumber || item.id}`,
    item,
    unit,
    recipient,
    user,
    canManage
  });
});

demoRoutes.post('/app/encomiendas/:parcelId/notificar', (req, res) => {
  const user = req.session.user;
  const item = findById('parcels', req.params.parcelId);
  if (!item) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  if (!userCanAccessUnit(user, item.unitId) && !user.roleCodes?.includes(ROLES.CONCIERGE) && !user.isCondominiumAdmin) return res.status(403).render('errors/403', { title: 'Acceso denegado', message: 'Permisos insuficientes' });
  update('parcels', item.id, { status: 'notified', notifiedAt: todayISO() });
  insert('notifications', {
    id: nextId('not'),
    userId: item.recipientPersonId,
    type: 'parcel',
    title: 'Encomienda recibida',
    body: `Tu encomienda ${item.trackingNumber} ya esta disponible`,
    link: `/app/encomiendas/${item.id}`,
    readAt: null,
    createdAt: todayISO()
  });
  flash(req, 'success', 'Destinatario notificado');
  recordAudit(req, 'parcels.notify', 'parcel', item.id, 'Notificada');
  res.redirect(`/app/encomiendas/${item.id}`);
});

demoRoutes.post('/app/encomiendas/:parcelId/entregar', (req, res) => {
  const user = req.session.user;
  const item = findById('parcels', req.params.parcelId);
  if (!item) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  if (!userCanAccessUnit(user, item.unitId) && !user.roleCodes?.includes(ROLES.CONCIERGE) && !user.isCondominiumAdmin) return res.status(403).render('errors/403', { title: 'Acceso denegado', message: 'Permisos insuficientes' });
  const body = readBody(req);
  if (!body.recipientName) return bad(res, 'Nombre de quien retira requerido');
  update('parcels', item.id, {
    status: 'delivered',
    deliveredBy: user.id,
    deliveredToName: body.recipientName,
    deliveredAt: todayISO()
  });
  flash(req, 'success', 'Encomienda entregada');
  recordAudit(req, 'parcels.deliver', 'parcel', item.id, `Entregada a ${body.recipientName}`);
  res.redirect(`/app/encomiendas/${item.id}`);
});

demoRoutes.post('/app/encomiendas/:parcelId/devolver', (req, res) => {
  const user = req.session.user;
  const item = findById('parcels', req.params.parcelId);
  if (!item) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  if (!userCanAccessUnit(user, item.unitId) && !user.roleCodes?.includes(ROLES.CONCIERGE) && !user.isCondominiumAdmin) return res.status(403).render('errors/403', { title: 'Acceso denegado', message: 'Permisos insuficientes' });
  const body = readBody(req);
  if (!body.reason) return bad(res, 'Motivo requerido');
  update('parcels', item.id, { status: 'returned', notes: body.reason });
  flash(req, 'success', 'Encomienda devuelta');
  recordAudit(req, 'parcels.return', 'parcel', item.id, body.reason);
  res.redirect(`/app/encomiendas/${item.id}`);
});

demoRoutes.get('/app/documentos', (req, res) => {
  const documents = getStore().documents.map((d) => ({
    ...d,
    category: d.categoryId.charAt(0).toUpperCase() + d.categoryId.slice(1)
  }));
  renderPage(req, res, 'documents/index', { title: 'Documentos', items: documents });
});

demoRoutes.get('/app/documentos/nuevo', (req, res) => {
  const user = req.session.user;
  if (!user.isCondominiumAdmin && !user.roleCodes?.includes(ROLES.TOWER_ADMIN)) return res.status(403).render('errors/403', { title: 'Acceso denegado', message: 'Permisos insuficientes' });
  renderPage(req, res, 'documents/form', {
    title: 'Nuevo documento',
    item: { visibility: 'residents', categoryId: 'reglamento' },
    formAction: '/app/documentos/nuevo',
    cancelHref: '/app/documentos',
    errors: {}
  });
});

demoRoutes.post('/app/documentos/nuevo', (req, res) => {
  const user = req.session.user;
  if (!user.isCondominiumAdmin && !user.roleCodes?.includes(ROLES.TOWER_ADMIN)) return res.status(403).render('errors/403', { title: 'Acceso denegado', message: 'Permisos insuficientes' });
  const body = readBody(req);
  const errors = {};
  if (!body.title) errors.title = 'Requerido';
  if (Object.keys(errors).length) {
    return renderPage(req, res, 'documents/form', {
      title: 'Nuevo documento',
      item: body,
      formAction: '/app/documentos/nuevo',
      cancelHref: '/app/documentos',
      errors
    });
  }
  const id = nextId('doc');
  insert('documents', {
    id,
    condominiumId: user.condominiumId,
    categoryId: body.categoryId || 'reglamento',
    title: body.title,
    description: body.description || '',
    storagePath: `/docs/${user.condominiumId}/${id}.pdf`,
    fileName: `${body.title}.pdf`,
    mimeType: 'application/pdf',
    fileSize: 0,
    version: 1,
    visibility: ['administration', 'committee', 'residents', 'public'].includes(body.visibility) ? body.visibility : 'residents',
    publishedAt: todayISO(),
    expiresAt: body.expiresAt || null,
    uploadedBy: user.id,
    archivedAt: null,
    demoNotice: 'Modo demo: el archivo no se almacena realmente.'
  });
  flash(req, 'info', 'Documento registrado como demo. No se almacena el archivo en este modo.');
  recordAudit(req, 'documents.create', 'document', id, 'Documento demo creado');
  res.redirect(`/app/documentos/${id}`);
});

demoRoutes.get('/app/documentos/:documentId', (req, res) => {
  const item = findById('documents', req.params.documentId);
  if (!item) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  renderPage(req, res, 'documents/show', { title: item.title, item });
});

demoRoutes.post('/app/documentos/:documentId/publicar', (req, res) => {
  const user = req.session.user;
  if (!user.isCondominiumAdmin && !user.roleCodes?.includes(ROLES.TOWER_ADMIN)) return res.status(403).render('errors/403', { title: 'Acceso denegado', message: 'Permisos insuficientes' });
  const item = findById('documents', req.params.documentId);
  if (!item) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  update('documents', item.id, { publishedAt: todayISO(), archivedAt: null });
  flash(req, 'success', 'Documento publicado');
  recordAudit(req, 'documents.publish', 'document', item.id, 'Documento publicado');
  res.redirect(`/app/documentos/${item.id}`);
});

demoRoutes.post('/app/documentos/:documentId/archivar', (req, res) => {
  const user = req.session.user;
  if (!user.isCondominiumAdmin && !user.roleCodes?.includes(ROLES.TOWER_ADMIN)) return res.status(403).render('errors/403', { title: 'Acceso denegado', message: 'Permisos insuficientes' });
  const item = findById('documents', req.params.documentId);
  if (!item) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  update('documents', item.id, { archivedAt: todayISO() });
  flash(req, 'success', 'Documento archivado');
  recordAudit(req, 'documents.archive', 'document', item.id, 'Documento archivado');
  res.redirect(`/app/documentos/${item.id}`);
});

demoRoutes.get('/app/comunicados', (req, res) => {
  const items = getStore().announcements.map((a) => ({
    ...a,
    author: findById('users', a.createdBy)?.fullName || 'Sistema'
  }));
  renderPage(req, res, 'announcements/index', { title: 'Comunicados', items });
});

demoRoutes.get('/app/comunicados/nuevo', (req, res) => {
  const user = req.session.user;
  if (!user.isCondominiumAdmin && !user.roleCodes?.includes(ROLES.TOWER_ADMIN)) return res.status(403).render('errors/403', { title: 'Acceso denegado', message: 'Permisos insuficientes' });
  renderPage(req, res, 'announcements/form', {
    title: 'Nuevo comunicado',
    item: { status: 'draft', priority: 'normal' },
    formAction: '/app/comunicados/nuevo',
    cancelHref: '/app/comunicados',
    errors: {}
  });
});

demoRoutes.post('/app/comunicados/nuevo', (req, res) => {
  const user = req.session.user;
  if (!user.isCondominiumAdmin && !user.roleCodes?.includes(ROLES.TOWER_ADMIN)) return res.status(403).render('errors/403', { title: 'Acceso denegado', message: 'Permisos insuficientes' });
  const body = readBody(req);
  const errors = {};
  if (!body.title) errors.title = 'Requerido';
  if (!body.body) errors.body = 'Requerido';
  if (Object.keys(errors).length) {
    return renderPage(req, res, 'announcements/form', {
      title: 'Nuevo comunicado',
      item: body,
      formAction: '/app/comunicados/nuevo',
      cancelHref: '/app/comunicados',
      errors
    });
  }
  const id = nextId('ann');
  insert('announcements', {
    id,
    condominiumId: user.condominiumId,
    title: body.title,
    body: body.body,
    priority: ['low', 'normal', 'high', 'urgent'].includes(body.priority) ? body.priority : 'normal',
    status: 'draft',
    publishedAt: null,
    expiresAt: body.expiresAt || null,
    createdBy: user.id,
    targets: ['condominium']
  });
  flash(req, 'success', 'Borrador creado');
  recordAudit(req, 'announcements.create', 'announcement', id, 'Borrador');
  res.redirect(`/app/comunicados/${id}`);
});

demoRoutes.post('/app/comunicados/:announcementId/editar', (req, res) => {
  const user = req.session.user;
  if (!user.isCondominiumAdmin && !user.roleCodes?.includes(ROLES.TOWER_ADMIN)) return res.status(403).render('errors/403', { title: 'Acceso denegado', message: 'Permisos insuficientes' });
  const item = findById('announcements', req.params.announcementId);
  if (!item) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  const body = readBody(req);
  update('announcements', item.id, {
    title: body.title || item.title,
    body: body.body || item.body,
    priority: ['low', 'normal', 'high', 'urgent'].includes(body.priority) ? body.priority : item.priority,
    expiresAt: body.expiresAt || item.expiresAt
  });
  flash(req, 'success', 'Comunicado actualizado');
  recordAudit(req, 'announcements.update', 'announcement', item.id, 'Actualizado');
  res.redirect(`/app/comunicados/${item.id}`);
});

demoRoutes.get('/app/comunicados/:announcementId', (req, res) => {
  const user = req.session.user;
  const item = findById('announcements', req.params.announcementId);
  if (!item) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  const author = findById('users', item.createdBy)?.fullName || 'Sistema';
  renderPage(req, res, 'announcements/show', { title: item.title, item, author, user });
});

demoRoutes.post('/app/comunicados/:announcementId/publicar', (req, res) => {
  const user = req.session.user;
  if (!user.isCondominiumAdmin && !user.roleCodes?.includes(ROLES.TOWER_ADMIN)) return res.status(403).render('errors/403', { title: 'Acceso denegado', message: 'Permisos insuficientes' });
  const item = findById('announcements', req.params.announcementId);
  if (!item) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  update('announcements', item.id, { status: 'published', publishedAt: todayISO() });
  const targets = getStore().users.filter((u) => u.condominiumId === user.condominiumId);
  for (const t of targets) {
    insert('notifications', {
      id: nextId('not'),
      userId: t.id,
      type: 'announcement',
      title: `Comunicado: ${item.title}`,
      body: item.body.slice(0, 120),
      link: `/app/comunicados/${item.id}`,
      readAt: null,
      createdAt: todayISO()
    });
  }
  flash(req, 'success', 'Comunicado publicado');
  recordAudit(req, 'announcements.publish', 'announcement', item.id, 'Publicado');
  res.redirect(`/app/comunicados/${item.id}`);
});

demoRoutes.post('/app/comunicados/:announcementId/programar', (req, res) => {
  const user = req.session.user;
  if (!user.isCondominiumAdmin && !user.roleCodes?.includes(ROLES.TOWER_ADMIN)) return res.status(403).render('errors/403', { title: 'Acceso denegado', message: 'Permisos insuficientes' });
  const item = findById('announcements', req.params.announcementId);
  if (!item) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  const body = readBody(req);
  if (!body.scheduledFor) return bad(res, 'Fecha requerida');
  update('announcements', item.id, { status: 'scheduled', publishedAt: body.scheduledFor });
  flash(req, 'success', 'Comunicado programado');
  recordAudit(req, 'announcements.schedule', 'announcement', item.id, body.scheduledFor);
  res.redirect(`/app/comunicados/${item.id}`);
});

demoRoutes.post('/app/comunicados/:announcementId/archivar', (req, res) => {
  const user = req.session.user;
  if (!user.isCondominiumAdmin && !user.roleCodes?.includes(ROLES.TOWER_ADMIN)) return res.status(403).render('errors/403', { title: 'Acceso denegado', message: 'Permisos insuficientes' });
  const item = findById('announcements', req.params.announcementId);
  if (!item) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  update('announcements', item.id, { status: 'archived' });
  flash(req, 'success', 'Comunicado archivado');
  recordAudit(req, 'announcements.archive', 'announcement', item.id, 'Archivado');
  res.redirect(`/app/comunicados/${item.id}`);
});

demoRoutes.get('/app/reservas', (req, res) => {
  const user = req.session.user;
  const items = filterReservationsForUser(user).map((r) => ({
    ...r,
    amenity: findById('amenities', r.amenityId),
    unit: findById('units', r.unitId),
    person: findById('people', r.requestedBy)
  }));
  renderPage(req, res, 'reservations/index', { title: 'Reservas', items });
});

demoRoutes.get('/app/reservas/nueva', (req, res) => {
  const user = req.session.user;
  const amenities = getStore().amenities;
  const units = filterUnitsForUser(user);
  renderPage(req, res, 'reservations/form', {
    title: 'Nueva reserva',
    amenities,
    units,
    item: { attendeeCount: 4 },
    formAction: '/app/reservas/nueva',
    cancelHref: '/app/reservas',
    errors: {}
  });
});

demoRoutes.post('/app/reservas/nueva', (req, res) => {
  const user = req.session.user;
  const body = readBody(req);
  const errors = {};
  if (!body.amenityId) errors.amenityId = 'Requerido';
  if (!body.unitId) errors.unitId = 'Requerido';
  if (!body.startsAt) errors.startsAt = 'Requerido';
  if (!body.endsAt) errors.endsAt = 'Requerido';
  if (body.startsAt && body.endsAt && body.endsAt <= body.startsAt) errors.endsAt = 'Debe ser mayor a inicio';
  if (!userCanAccessUnit(user, body.unitId) && !user.isCondominiumAdmin) return res.status(403).render('errors/403', { title: 'Acceso denegado', message: 'Unidad fuera de alcance' });
  if (Object.keys(errors).length) {
    return renderPage(req, res, 'reservations/form', {
      title: 'Nueva reserva',
      amenities: getStore().amenities,
      units: filterUnitsForUser(user),
      item: body,
      formAction: '/app/reservas/nueva',
      cancelHref: '/app/reservas',
      errors
    });
  }
  const overlap = listWhere('reservations', (r) => r.amenityId === body.amenityId && r.status === 'approved' && r.startsAt < body.endsAt && r.endsAt > body.startsAt);
  if (overlap.length) return bad(res, 'Horario ocupado en ese espacio');
  const occupant = listWhere('occupancies', (o) => o.unitId === body.unitId && o.endsOn === null && o.isPrimary)[0];
  const id = nextId('res');
  const person = occupant ? occupant.personId : (findById('units', body.unitId)?.id && getStore().people[0]?.id);
  insert('reservations', {
    id,
    amenityId: body.amenityId,
    unitId: body.unitId,
    requestedBy: person || user.personId,
    startsAt: body.startsAt,
    endsAt: body.endsAt,
    attendeeCount: Number(body.attendeeCount) || 1,
    status: 'requested',
    notes: body.notes || '',
    approvedBy: null,
    approvedAt: null,
    rejectionReason: null
  });
  flash(req, 'success', 'Reserva solicitada');
  recordAudit(req, 'reservations.create', 'reservation', id, 'Reserva solicitada');
  res.redirect(`/app/reservas/${id}`);
});

demoRoutes.get('/app/reservas/:reservationId', (req, res) => {
  const user = req.session.user;
  const item = findById('reservations', req.params.reservationId);
  if (!item) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  if (!userCanAccessUnit(user, item.unitId) && !user.isCondominiumAdmin && !user.roleCodes?.includes(ROLES.TOWER_ADMIN) && !user.roleCodes?.includes(ROLES.CONCIERGE)) return res.status(403).render('errors/403', { title: 'Acceso denegado', message: 'Reserva fuera de alcance' });
  const amenity = findById('amenities', item.amenityId);
  const unit = findById('units', item.unitId);
  const person = findById('people', item.requestedBy);
  const canManage = user.isCondominiumAdmin || (user.roleCodes ?? []).some((r) => [ROLES.TOWER_ADMIN, ROLES.CONCIERGE].includes(r));
  renderPage(req, res, 'reservations/show', { title: 'Reserva', item, amenity, unit, person, user, canManage });
});

demoRoutes.post('/app/reservas/:reservationId/aprobar', (req, res) => {
  const user = req.session.user;
  if (!user.isCondominiumAdmin && !user.roleCodes?.includes(ROLES.TOWER_ADMIN) && !user.roleCodes?.includes(ROLES.CONCIERGE)) return res.status(403).render('errors/403', { title: 'Acceso denegado', message: 'Permisos insuficientes' });
  const item = findById('reservations', req.params.reservationId);
  if (!item) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  update('reservations', item.id, { status: 'approved', approvedBy: user.id, approvedAt: todayISO() });
  flash(req, 'success', 'Reserva aprobada');
  recordAudit(req, 'reservations.approve', 'reservation', item.id, 'Aprobada');
  res.redirect(`/app/reservas/${item.id}`);
});

demoRoutes.post('/app/reservas/:reservationId/rechazar', (req, res) => {
  const user = req.session.user;
  if (!user.isCondominiumAdmin && !user.roleCodes?.includes(ROLES.TOWER_ADMIN) && !user.roleCodes?.includes(ROLES.CONCIERGE)) return res.status(403).render('errors/403', { title: 'Acceso denegado', message: 'Permisos insuficientes' });
  const item = findById('reservations', req.params.reservationId);
  if (!item) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  const body = readBody(req);
  if (!body.reason) return bad(res, 'Motivo requerido');
  update('reservations', item.id, { status: 'rejected', rejectionReason: body.reason });
  flash(req, 'success', 'Reserva rechazada');
  recordAudit(req, 'reservations.reject', 'reservation', item.id, body.reason);
  res.redirect(`/app/reservas/${item.id}`);
});

demoRoutes.post('/app/reservas/:reservationId/cancelar', (req, res) => {
  const user = req.session.user;
  const item = findById('reservations', req.params.reservationId);
  if (!item) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  if (!userCanAccessUnit(user, item.unitId) && !user.isCondominiumAdmin && !user.roleCodes?.includes(ROLES.TOWER_ADMIN)) return res.status(403).render('errors/403', { title: 'Acceso denegado', message: 'Reserva fuera de alcance' });
  update('reservations', item.id, { status: 'cancelled' });
  flash(req, 'success', 'Reserva cancelada');
  recordAudit(req, 'reservations.cancel', 'reservation', item.id, 'Cancelada');
  res.redirect(`/app/reservas/${item.id}`);
});

demoRoutes.get('/app/espacios-comunes', (req, res) => {
  renderPage(req, res, 'amenities/index', { title: 'Espacios comunes', items: getStore().amenities });
});

demoRoutes.get('/app/espacios-comunes/nuevo', (req, res) => {
  const user = req.session.user;
  if (!user.isCondominiumAdmin) return res.status(403).render('errors/403', { title: 'Acceso denegado', message: 'Permisos insuficientes' });
  renderPage(req, res, 'amenities/form', {
    title: 'Nuevo espacio',
    item: { requiresApproval: true, capacity: 20, price: 0, depositAmount: 0 },
    formAction: '/app/espacios-comunes/nuevo',
    cancelHref: '/app/espacios-comunes',
    errors: {}
  });
});

demoRoutes.post('/app/espacios-comunes/nuevo', (req, res) => {
  const user = req.session.user;
  if (!user.isCondominiumAdmin) return res.status(403).render('errors/403', { title: 'Acceso denegado', message: 'Permisos insuficientes' });
  const body = readBody(req);
  const id = nextId('amn');
  insert('amenities', {
    id,
    condominiumId: user.condominiumId,
    name: body.name || 'Espacio',
    description: body.description || '',
    capacity: Number(body.capacity) || 1,
    requiresApproval: body.requiresApproval === 'on',
    price: Number(body.price) || 0,
    depositAmount: Number(body.depositAmount) || 0,
    rulesDocumentId: null,
    active: true
  });
  flash(req, 'success', 'Espacio creado');
  recordAudit(req, 'amenities.create', 'amenity', id, 'Espacio creado');
  res.redirect(`/app/espacios-comunes/${id}`);
});

demoRoutes.get('/app/espacios-comunes/:amenityId', (req, res) => {
  const item = findById('amenities', req.params.amenityId);
  if (!item) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  renderPage(req, res, 'amenities/show', { title: item.name, item });
});

demoRoutes.get('/app/espacios-comunes/:amenityId/horarios', (req, res) => {
  const item = findById('amenities', req.params.amenityId);
  if (!item) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  renderPage(req, res, 'amenities/schedule', { title: `${item.name} - Horarios`, item });
});

demoRoutes.get('/app/usuarios', (req, res) => {
  const user = req.session.user;
  if (!user.isCondominiumAdmin) return res.status(403).render('errors/403', { title: 'Acceso denegado', message: 'Permisos insuficientes' });
  const items = getStore().users.map((u) => ({
    ...u,
    person: findById('people', u.personId),
    towers: (u.towerIds ?? []).map((id) => findById('towers', id)).filter(Boolean)
  }));
  renderPage(req, res, 'users/index', { title: 'Usuarios', items });
});

demoRoutes.get('/app/usuarios/nuevo', (req, res) => {
  const user = req.session.user;
  if (!user.isCondominiumAdmin) return res.status(403).render('errors/403', { title: 'Acceso denegado', message: 'Permisos insuficientes' });
  renderPage(req, res, 'users/form', {
    title: 'Nuevo usuario',
    item: { mustChangePassword: true, status: 'active' },
    people: getStore().people,
    roles: Object.keys(ROLE_PERMISSIONS),
    towers: filterTowersForUser(user),
    formAction: '/app/usuarios/nuevo',
    cancelHref: '/app/usuarios',
    errors: {}
  });
});

demoRoutes.post('/app/usuarios/nuevo', (req, res) => {
  const user = req.session.user;
  if (!user.isCondominiumAdmin) return res.status(403).render('errors/403', { title: 'Acceso denegado', message: 'Permisos insuficientes' });
  const body = readBody(req);
  const errors = {};
  if (!body.username) errors.username = 'Requerido';
  if (!body.email) errors.email = 'Requerido';
  if (!body.personId) errors.personId = 'Requerido';
  if (body.email && !/^\S+@\S+\.\S+$/.test(body.email)) errors.email = 'Email no valido';
  if (Object.keys(errors).length) {
    return renderPage(req, res, 'users/form', {
      title: 'Nuevo usuario',
      item: body,
      people: getStore().people,
      roles: Object.keys(ROLE_PERMISSIONS),
      towers: filterTowersForUser(user),
      formAction: '/app/usuarios/nuevo',
      cancelHref: '/app/usuarios',
      errors
    });
  }
  const id = nextId('usr');
  const tower = body.tower ? [body.tower] : [];
  insert('users', {
    id,
    personId: body.personId,
    email: body.email,
    username: body.username,
    password: 'demo123',
    status: 'active',
    mustChangePassword: body.mustChangePassword === 'on',
    roleCodes: body.role ? [body.role] : [ROLES.RESIDENT],
    condominiumId: user.condominiumId,
    towerIds: tower,
    unitIds: [],
    fullName: findById('people', body.personId)?.fullName || body.username
  });
  flash(req, 'success', 'Usuario creado. Contrasena demo: demo123');
  recordAudit(req, 'users.create', 'user', id, 'Usuario creado');
  res.redirect(`/app/usuarios/${id}`);
});

demoRoutes.get('/app/usuarios/:userId', (req, res) => {
  const user = req.session.user;
  if (!user.isCondominiumAdmin) return res.status(403).render('errors/403', { title: 'Acceso denegado', message: 'Permisos insuficientes' });
  const item = findById('users', req.params.userId);
  if (!item) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  const person = findById('people', item.personId);
  const towers = (item.towerIds ?? []).map((id) => findById('towers', id)).filter(Boolean);
  renderPage(req, res, 'users/show', { title: item.username, item, person, towers });
});

demoRoutes.get('/app/usuarios/:userId/editar', (req, res) => {
  const user = req.session.user;
  if (!user.isCondominiumAdmin) return res.status(403).render('errors/403', { title: 'Acceso denegado', message: 'Permisos insuficientes' });
  const item = findById('users', req.params.userId);
  if (!item) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  renderPage(req, res, 'users/form', {
    title: `Editar ${item.username}`,
    item,
    people: getStore().people,
    roles: Object.keys(ROLE_PERMISSIONS),
    towers: filterTowersForUser(user),
    formAction: `/app/usuarios/${item.id}/editar`,
    cancelHref: `/app/usuarios/${item.id}`,
    errors: {}
  });
});

demoRoutes.post('/app/usuarios/:userId/editar', (req, res) => {
  const user = req.session.user;
  if (!user.isCondominiumAdmin) return res.status(403).render('errors/403', { title: 'Acceso denegado', message: 'Permisos insuficientes' });
  const item = findById('users', req.params.userId);
  if (!item) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  const body = readBody(req);
  const email = body.email || item.email;
  if (body.email && !/^\S+@\S+\.\S+$/.test(email)) return bad(res, 'Email no valido');
  const roleCodes = body.role ? [body.role] : item.roleCodes;
  const towerIds = body.tower ? [body.tower] : item.towerIds ?? [];
  update('users', item.id, {
    email,
    username: body.username || item.username,
    status: body.status || item.status,
    mustChangePassword: body.mustChangePassword === 'on',
    roleCodes,
    towerIds,
    fullName: findById('people', item.personId)?.fullName || item.username
  });
  flash(req, 'success', 'Usuario actualizado');
  recordAudit(req, 'users.update', 'user', item.id, 'Usuario actualizado');
  res.redirect(`/app/usuarios/${item.id}`);
});

demoRoutes.post('/app/usuarios/:userId/estado', (req, res) => {
  const user = req.session.user;
  if (!user.isCondominiumAdmin) return res.status(403).render('errors/403', { title: 'Acceso denegado', message: 'Permisos insuficientes' });
  const item = findById('users', req.params.userId);
  if (!item) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  const body = readBody(req);
  update('users', item.id, { status: body.status });
  flash(req, 'success', 'Estado actualizado');
  recordAudit(req, 'users.status', 'user', item.id, body.status);
  res.redirect(`/app/usuarios/${item.id}`);
});

demoRoutes.get('/app/usuarios/:userId/asignaciones', (req, res) => {
  const user = req.session.user;
  if (!user.isCondominiumAdmin) return res.status(403).render('errors/403', { title: 'Acceso denegado', message: 'Permisos insuficientes' });
  const item = findById('users', req.params.userId);
  if (!item) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  const towers = (item.towerIds ?? []).map((id) => findById('towers', id)).filter(Boolean);
  renderPage(req, res, 'users/assignments', { title: 'Asignaciones', item, towers });
});

demoRoutes.post('/app/usuarios/:userId/torres', (req, res) => {
  const user = req.session.user;
  if (!user.isCondominiumAdmin) return res.status(403).render('errors/403', { title: 'Acceso denegado', message: 'Permisos insuficientes' });
  const item = findById('users', req.params.userId);
  if (!item) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  const body = readBody(req);
  const ids = Array.isArray(body.towerIds) ? body.towerIds : (body.towerIds ? [body.towerIds] : []);
  const towers = filterTowersForUser(user).map((t) => t.id);
  const safe = ids.filter((id) => towers.includes(id));
  update('users', item.id, { towerIds: safe });
  flash(req, 'success', 'Torres asignadas');
  recordAudit(req, 'users.assign', 'user', item.id, `Torres ${safe.join(',')}`);
  res.redirect(`/app/usuarios/${item.id}/asignaciones`);
});

demoRoutes.get('/app/roles', (req, res) => {
  const user = req.session.user;
  if (!user.isCondominiumAdmin) return res.status(403).render('errors/403', { title: 'Acceso denegado', message: 'Permisos insuficientes' });
  const data = Object.values(ROLES).map((code) => ({
    code,
    label: code.replace(/_/g, ' '),
    permissions: ROLE_PERMISSIONS[code] ?? []
  }));
  renderPage(req, res, 'users/roles', { title: 'Roles', items: data });
});

demoRoutes.get('/app/auditoria', (req, res) => {
  const user = req.session.user;
  const audits = getStore().audits.filter((a) => a.condominiumId === user.condominiumId).map((a) => ({
    ...a,
    actor: findById('users', a.actorUserId)?.fullName || 'Sistema'
  }));
  renderPage(req, res, 'audit/index', { title: 'Auditoria', items: audits });
});

demoRoutes.get('/app/notificaciones', (req, res) => {
  const user = req.session.user;
  const items = getStore().notifications.filter((n) => n.userId === user.id || user.isCondominiumAdmin);
  renderPage(req, res, 'notifications/index', { title: 'Notificaciones', items });
});

demoRoutes.post('/app/notificaciones/:notificationId/leer', (req, res) => {
  const user = req.session.user;
  const item = findById('notifications', req.params.notificationId);
  if (!item) return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  if (item.userId !== user.id && !user.isCondominiumAdmin) return res.status(403).render('errors/403', { title: 'Acceso denegado', message: 'Notificacion fuera de alcance' });
  update('notifications', item.id, { readAt: todayISO() });
  res.redirect('/app/notificaciones');
});

demoRoutes.get('/app/reportes', (req, res) => {
  renderPage(req, res, 'reports/index', { title: 'Reportes' });
});

demoRoutes.get('/app/reportes/financiero', (req, res) => {
  const user = req.session.user;
  const periods = getStore().periods.filter((p) => p.condominiumId === user.condominiumId);
  const totalFacturado = periods.reduce((s, p) => s + p.totalAmount, 0);
  const totalCobrado = periods.reduce((s, p) => {
    const c = listWhere('charges', (ch) => ch.periodId === p.id).reduce((a, ch) => a + ch.paidAmount, 0);
    return s + c;
  }, 0);
  const categories = getStore().expenseCategories.map((c) => {
    const seed = (c.name?.length || 0) || 1;
    return { label: c.name, percent: Math.round((seed * 7) % 35) + 10 };
  });
  renderPage(req, res, 'reports/financial', {
    title: 'Reporte financiero',
    facturado: totalFacturado,
    cobrado: totalCobrado,
    saldo: totalFacturado - totalCobrado,
    tasa: totalFacturado === 0 ? 0 : Math.round((totalCobrado / totalFacturado) * 100),
    categories
  });
});

demoRoutes.get('/app/reportes/recaudacion', (req, res) => {
  const user = req.session.user;
  const periods = getStore().periods.filter((p) => p.condominiumId === user.condominiumId);
  const rows = periods.map((p) => {
    const charges = listWhere('charges', (c) => c.periodId === p.id);
    const paid = charges.reduce((s, c) => s + c.paidAmount, 0);
    return { label: `${p.monthName.slice(0, 3)} ${p.year}`, total: p.totalAmount, paid };
  });
  renderPage(req, res, 'reports/collection', { title: 'Recaudacion', items: rows });
});

demoRoutes.get('/app/reportes/morosidad', (req, res) => {
  const items = filterTowersForUser(req.session.user).map((t) => {
    const units = listWhere('units', (u) => u.towerId === t.id);
    const charges = listWhere('charges', (c) => units.map((u) => u.id).includes(c.unitId));
    const total = charges.reduce((s, c) => s + c.totalAmount, 0);
    const paid = charges.reduce((s, c) => s + c.paidAmount, 0);
    return { label: t.name, total, paid, balance: total - paid, percent: total === 0 ? 0 : Math.round(((total - paid) / total) * 100) };
  });
  renderPage(req, res, 'reports/delinquency', { title: 'Reporte de morosidad', items });
});

demoRoutes.get('/app/reportes/gastos', (req, res) => {
  const categories = getStore().expenseCategories.map((c) => ({
    name: c.name,
    code: c.code ?? ''
  }));
  renderPage(req, res, 'reports/expenses', { title: 'Reporte de gastos', categories });
});

demoRoutes.get('/app/reportes/mantenimientos', (req, res) => {
  const items = filterMaintenanceForUser(req.session.user);
  const byStatus = items.reduce((acc, m) => {
    acc[m.status] = (acc[m.status] || 0) + 1;
    return acc;
  }, {});
  renderPage(req, res, 'reports/maintenance', { title: 'Reporte de mantenimientos', total: items.length, byStatus });
});

demoRoutes.get('/app/reportes/multas', (req, res) => {
  const items = filterFinesForUser(req.session.user);
  const byStatus = items.reduce((acc, f) => {
    acc[f.status] = (acc[f.status] || 0) + 1;
    return acc;
  }, {});
  renderPage(req, res, 'reports/fines', { title: 'Reporte de multas', total: items.length, byStatus });
});

demoRoutes.get('/app/reportes/encomiendas', (req, res) => {
  const items = filterParcelsForUser(req.session.user);
  const pendientes = items.filter((p) => p.status === 'received' || p.status === 'notified').length;
  const entregadas = items.filter((p) => p.status === 'delivered').length;
  const devueltas = items.filter((p) => p.status === 'returned').length;
  renderPage(req, res, 'reports/parcels', { title: 'Reporte de encomiendas', total: items.length, pendientes, entregadas, devueltas });
});

demoRoutes.get('/app/reportes/reservas', (req, res) => {
  const items = filterReservationsForUser(req.session.user);
  const byStatus = items.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});
  renderPage(req, res, 'reports/reservations', { title: 'Reporte de reservas', total: items.length, byStatus });
});

demoRoutes.get('/app/reportes/:report/csv', (req, res) => {
  const user = req.session.user;
  const store = getStore();

  if (req.params.report === 'financiero') {
    const periods = store.periods.filter((p) => p.condominiumId === user.condominiumId);
    const total = periods.reduce((s, p) => s + p.totalAmount, 0);
    const paid = periods.reduce((s, p) => {
      const periodPaid = listWhere('charges', (c) => c.periodId === p.id).reduce((a, c) => a + c.paidAmount, 0);
      return s + periodPaid;
    }, 0);
    return sendCsv(res, 'reporte-financiero', [['Metrica', 'Valor'], ['Facturado', total], ['Cobrado', paid], ['Saldo', total - paid]]);
  }

  if (req.params.report === 'recaudacion') {
    const rows = store.periods.filter((p) => p.condominiumId === user.condominiumId).map((p) => {
      const charges = listWhere('charges', (c) => c.periodId === p.id);
      const paid = charges.reduce((s, c) => s + c.paidAmount, 0);
      return [p.monthName, p.year, p.totalAmount, paid, p.totalAmount - paid];
    });
    return sendCsv(res, 'reporte-recaudacion', [['Mes', 'Ano', 'Facturado', 'Cobrado', 'Saldo'], ...rows]);
  }

  if (req.params.report === 'morosidad') {
    const rows = filterTowersForUser(user).map((t) => {
      const units = listWhere('units', (u) => u.towerId === t.id);
      const unitIds = units.map((u) => u.id);
      const charges = listWhere('charges', (c) => unitIds.includes(c.unitId));
      const total = charges.reduce((s, c) => s + c.totalAmount, 0);
      const paid = charges.reduce((s, c) => s + c.paidAmount, 0);
      return [t.name, total, paid, total - paid];
    });
    return sendCsv(res, 'reporte-morosidad', [['Torre', 'Facturado', 'Cobrado', 'Saldo'], ...rows]);
  }

  if (req.params.report === 'gastos') {
    const rows = store.expenseCategories.map((c) => [c.name, c.code ?? '']);
    return sendCsv(res, 'reporte-gastos', [['Categoria', 'Codigo'], ...rows]);
  }

  if (req.params.report === 'mantenimientos') {
    const rows = Object.entries(countByStatus(filterMaintenanceForUser(user)));
    return sendCsv(res, 'reporte-mantenimientos', [['Estado', 'Cantidad'], ...rows]);
  }

  if (req.params.report === 'multas') {
    const rows = Object.entries(countByStatus(filterFinesForUser(user)));
    return sendCsv(res, 'reporte-multas', [['Estado', 'Cantidad'], ...rows]);
  }

  if (req.params.report === 'encomiendas') {
    const rows = Object.entries(countByStatus(filterParcelsForUser(user)));
    return sendCsv(res, 'reporte-encomiendas', [['Estado', 'Cantidad'], ...rows]);
  }

  if (req.params.report === 'reservas') {
    const rows = Object.entries(countByStatus(filterReservationsForUser(user)));
    return sendCsv(res, 'reporte-reservas', [['Estado', 'Cantidad'], ...rows]);
  }

  return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
});

demoRoutes.get('/app', (req, res) => {
  const user = req.session.user;
  const store = getStore();
  const towers = filterTowersForUser(user);
  const units = filterUnitsForUser(user);
  const periodIds = new Set(store.periods.map((p) => p.id));
  const relevantCharges = store.charges.filter((c) => periodIds.has(c.periodId));
  const delinquencyByTower = towers.map((t) => {
    const tUnits = units.filter((u) => u.towerId === t.id);
    const tCharges = relevantCharges.filter((c) => tUnits.map((u) => u.id).includes(c.unitId));
    const total = tCharges.reduce((s, c) => s + c.totalAmount, 0);
    const paid = tCharges.reduce((s, c) => s + c.paidAmount, 0);
    const percent = total === 0 ? 0 : Math.round(((total - paid) / total) * 100);
    return { name: t.name, units: tUnits.length, percent };
  });
  const recentActivity = store.audits.slice(0, 5).map((a) => ({
    title: a.action,
    detail: a.summary || a.entityType
  }));
  const monthBuckets = new Map();
  for (const p of store.periods) {
    const key = `${p.year}-${String(p.month).padStart(2, '0')}`;
    const charges = listWhere('charges', (c) => c.periodId === p.id);
    const paid = charges.reduce((s, c) => s + c.paidAmount, 0);
    monthBuckets.set(key, { label: p.monthName.slice(0, 3), value: paid });
  }
  const collectionChart = Array.from(monthBuckets.values()).slice(-6);
  const totalBilled = store.charges.reduce((s, c) => s + c.totalAmount, 0);
  const totalPaid = store.charges.reduce((s, c) => s + c.paidAmount, 0);
  const activeResidents = store.users.filter((u) => u.roleCodes?.includes(ROLES.RESIDENT)).length;
  const dashboardStats = [
    { label: 'Residentes activos', value: activeResidents },
    { label: 'Pagos del mes', value: store.payments.length },
    { label: 'Multas activas', value: store.fines.filter((f) => ['notified', 'confirmed'].includes(f.status)).length },
    { label: 'Mantenimientos abiertos', value: store.maintenance.filter((m) => ['new', 'assigned', 'in_progress', 'in_review'].includes(m.status)).length }
  ];
  renderPage(req, res, 'dashboard/index', {
    title: 'Panel principal',
    dashboardStats,
    towersCount: towers.length,
    unitsCount: units.length,
    residentsCount: activeResidents,
    paymentsCount: store.payments.length,
    delinquencyByTower,
    recentActivity,
    collectionChart,
    totalBilled,
    totalPaid
  });
});

demoRoutes.get('/app/residentes', (req, res) => res.redirect('/app/personas'));
demoRoutes.get('/app/residentes/nuevo', (req, res) => res.redirect('/app/personas/nuevo'));
demoRoutes.get('/app/residentes/:personId', (req, res) => res.redirect(`/app/personas/${req.params.personId}`));
demoRoutes.get('/app/residentes/:personId/editar', (req, res) => res.redirect(`/app/personas/${req.params.personId}/editar`));
demoRoutes.get('/app/residentes/:personId/ocupaciones', (req, res) => res.redirect(`/app/personas/${req.params.personId}/ocupaciones`));
demoRoutes.get('/app/departamentos', (req, res) => res.redirect('/app/unidades'));
demoRoutes.get('/mi-cuenta', (req, res) => res.redirect('/app/mi-cuenta'));
demoRoutes.get('/mi-unidad', (req, res) => res.redirect('/app/mi-unidad'));
demoRoutes.get('/recuperar-acceso', (req, res) => res.redirect('/app/recuperar-acceso'));
demoRoutes.get('/cambiar-contrasena', (req, res) => res.redirect('/app/cambiar-contrasena'));
demoRoutes.post('/cambiar-contrasena', (req, res) => {
  const user = req.session.user;
  const body = readBody(req);
  if (!body.current || !body.next || body.next !== body.confirm) return bad(res, 'Contrasenas invalidas');
  flash(req, 'success', 'Contrasena actualizada');
  recordAudit(req, 'users.change_password', 'user', user.id, 'Cambio de contrasena');
  res.redirect('/app/mi-cuenta');
});
demoRoutes.post('/recuperar-acceso', (req, res) => {
  flash(req, 'info', 'Si el correo existe, te enviamos instrucciones (demo).');
  res.redirect('/login');
});
