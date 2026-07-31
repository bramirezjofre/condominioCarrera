import {
  listByUnit,
  findById,
  create,
  endOccupancy
} from './occupancies.repository.js';
import { createOccupancySchema, endOccupancySchema } from './occupancies.schema.js';
import { findById as findUnitById } from '../units/units.repository.js';
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

export async function listByUnitPage(req, res, next) {
  try {
    const unit = await findUnitById(req.params.unitId);
    if (!unit) throw new NotFoundError('Unidad no encontrada');
    const tower = await findTowerById(unit.tower_id);
    assertTowerAccess(req, tower);
    const occupancies = await listByUnit(unit.id);
    res.render('occupancies/index', {
      title: `Ocupaciones - Unidad ${unit.number}`,
      unit,
      tower,
      occupancies
    });
  } catch (err) {
    next(err);
  }
}

export async function showNew(req, res, next) {
  try {
    const unit = await findUnitById(req.params.unitId);
    if (!unit) throw new NotFoundError('Unidad no encontrada');
    const tower = await findTowerById(unit.tower_id);
    assertTowerAccess(req, tower);
    res.render('occupancies/form', {
      title: `Nueva ocupacion - Unidad ${unit.number}`,
      error: null,
      values: { startsOn: new Date().toISOString().slice(0, 10) },
      unit,
      tower
    });
  } catch (err) {
    next(err);
  }
}

export async function createOne(req, res, next) {
  try {
    const unit = await findUnitById(req.params.unitId);
    if (!unit) throw new NotFoundError('Unidad no encontrada');
    const tower = await findTowerById(unit.tower_id);
    assertTowerAccess(req, tower);
    const parsed = createOccupancySchema.safeParse({ ...req.body, unitId: unit.id });
    if (!parsed.success) {
      return res.status(400).render('occupancies/form', {
        title: `Nueva ocupacion - Unidad ${unit.number}`,
        error: 'Datos invalidos',
        values: req.body,
        unit,
        tower
      });
    }
    const occupancy = await create(parsed.data);
    await createAuditEvent({
      actorUserId: req.session?.user?.id ?? null,
      action: 'occupancies.create',
      entityType: 'unit_occupancy',
      entityId: occupancy.id,
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null
    });
    res.redirect(`/app/torres/${tower.id}#units`);
  } catch (err) {
    next(err);
  }
}

export async function endOne(req, res, next) {
  try {
    const occupancy = await findById(req.params.occupancyId);
    if (!occupancy) throw new NotFoundError('Ocupacion no encontrada');
    const unit = await findUnitById(occupancy.unit_id);
    const tower = await findTowerById(unit.tower_id);
    assertTowerAccess(req, tower);
    const parsed = endOccupancySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).redirect(`/app/torres/${tower.id}#units`);
    }
    const ended = await endOccupancy(occupancy.id, parsed.data.endsOn);
    if (ended) {
      await createAuditEvent({
        actorUserId: req.session?.user?.id ?? null,
        action: 'occupancies.end',
        entityType: 'unit_occupancy',
        entityId: occupancy.id,
        ipAddress: req.ip ?? null,
        userAgent: req.headers['user-agent'] ?? null
      });
    }
    res.redirect(`/app/torres/${tower.id}#units`);
  } catch (err) {
    next(err);
  }
}