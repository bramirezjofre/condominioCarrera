import { listByTower, findById, create, update } from './units.repository.js';
import { createUnitSchema, updateUnitSchema } from './units.schema.js';
import { findById as findTowerById } from '../towers/towers.repository.js';
import { createAuditEvent } from '../auth/auth.repository.js';
import { ForbiddenError, NotFoundError } from '../../shared/errors/index.js';

function assertTowerAccess(req, tower) {
  if (req.session?.user?.isCondominiumAdmin) return;
  if (req.session?.user?.condominiumId !== tower.condominium_id) {
    throw new ForbiddenError('Condominio fuera de alcance');
  }
  if (!req.session.user.towerIds?.includes(tower.id)) {
    throw new ForbiddenError('Torre fuera de alcance');
  }
}

export async function listByTowerPage(req, res, next) {
  try {
    const tower = await findTowerById(req.params.towerId);
    if (!tower) throw new NotFoundError('Torre no encontrada');
    assertTowerAccess(req, tower);
    const units = await listByTower(tower.id);
    res.render('units/index', { title: `Unidades - ${tower.name}`, tower, units });
  } catch (err) {
    next(err);
  }
}

export async function showNew(req, res, next) {
  try {
    const tower = await findTowerById(req.params.towerId);
    if (!tower) throw new NotFoundError('Torre no encontrada');
    assertTowerAccess(req, tower);
    res.render('units/form', {
      title: `Nueva unidad - ${tower.name}`,
      error: null,
      values: { kind: 'departamento', prorationFactor: 0 },
      tower
    });
  } catch (err) {
    next(err);
  }
}

export async function createOne(req, res, next) {
  try {
    const tower = await findTowerById(req.params.towerId);
    if (!tower) throw new NotFoundError('Torre no encontrada');
    assertTowerAccess(req, tower);
    const parsed = createUnitSchema.safeParse({ ...req.body, towerId: tower.id });
    if (!parsed.success) {
      return res.status(400).render('units/form', {
        title: `Nueva unidad - ${tower.name}`,
        error: 'Datos invalidos',
        values: req.body,
        tower
      });
    }
    const unit = await create(parsed.data);
    await createAuditEvent({
      actorUserId: req.session?.user?.id ?? null,
      action: 'units.create',
      entityType: 'unit',
      entityId: unit.id,
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null
    });
    res.redirect(`/app/torres/${tower.id}#units`);
  } catch (err) {
    next(err);
  }
}

export async function showEdit(req, res, next) {
  try {
    const unit = await findById(req.params.unitId);
    if (!unit) throw new NotFoundError('Unidad no encontrada');
    const tower = await findTowerById(unit.tower_id);
    assertTowerAccess(req, tower);
    res.render('units/form', {
      title: `Editar unidad ${unit.number}`,
      error: null,
      values: unit,
      tower
    });
  } catch (err) {
    next(err);
  }
}

export async function updateOne(req, res, next) {
  try {
    const unit = await findById(req.params.unitId);
    if (!unit) throw new NotFoundError('Unidad no encontrada');
    const tower = await findTowerById(unit.tower_id);
    assertTowerAccess(req, tower);
    const parsed = updateUnitSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).render('units/form', {
        title: `Editar unidad ${unit.number}`,
        error: 'Datos invalidos',
        values: { ...unit, ...req.body },
        tower
      });
    }
    await update(unit.id, parsed.data);
    await createAuditEvent({
      actorUserId: req.session?.user?.id ?? null,
      action: 'units.update',
      entityType: 'unit',
      entityId: unit.id,
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null
    });
    res.redirect(`/app/torres/${tower.id}#units`);
  } catch (err) {
    next(err);
  }
}