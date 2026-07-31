import {
  listByCondominium,
  findById,
  create,
  update,
  getActiveAdministrator,
  assignAdministrator
} from './towers.repository.js';
import {
  createTowerSchema,
  updateTowerSchema,
  assignAdministratorSchema
} from './towers.schema.js';
import { createAuditEvent } from '../auth/auth.repository.js';
import { ForbiddenError, NotFoundError } from '../../shared/errors/index.js';

function assertCondominiumAccess(req, target) {
  if (req.session?.user?.isCondominiumAdmin) return;
  if (req.session?.user?.condominiumId === target) return;
  throw new ForbiddenError('Condominio fuera de alcance');
}

function assertTowerAccess(req, tower) {
  if (req.session?.user?.isCondominiumAdmin) return;
  if (req.session?.user?.condominiumId !== tower.condominium_id) {
    throw new ForbiddenError('Condominio fuera de alcance');
  }
  if (!req.session.user.towerIds?.includes(tower.id) && !req.session.user.isCondominiumAdmin) {
    throw new ForbiddenError('Torre fuera de alcance');
  }
}

export async function listJson(req, res) {
  const condominiumId = req.query.condominiumId ?? req.session?.user?.condominiumId;
  assertCondominiumAccess(req, condominiumId);
  const items = await listByCondominium(condominiumId);
  res.json({ data: items });
}

export async function listPage(req, res) {
  const condominiumId = req.session?.user?.condominiumId;
  const towers = await listByCondominium(condominiumId);
  res.render('towers/index', { title: 'Torres', towers });
}

export async function showNew(req, res) {
  res.render('towers/form', {
    title: 'Nueva torre',
    error: null,
    values: {},
    condominiumId: req.session?.user?.condominiumId ?? ''
  });
}

export async function createOne(req, res, next) {
  try {
    const parsed = createTowerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).render('towers/form', {
        title: 'Nueva torre',
        error: 'Datos invalidos',
        values: req.body,
        condominiumId: req.session?.user?.condominiumId ?? ''
      });
    }
    assertCondominiumAccess(req, parsed.data.condominiumId);
    const tower = await create(parsed.data);
    await createAuditEvent({
      actorUserId: req.session?.user?.id ?? null,
      action: 'towers.create',
      entityType: 'tower',
      entityId: tower.id,
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null
    });
    res.redirect(`/app/torres/${tower.id}`);
  } catch (err) {
    next(err);
  }
}

export async function showOne(req, res, next) {
  try {
    const tower = await findById(req.params.towerId);
    if (!tower) throw new NotFoundError('Torre no encontrada');
    assertTowerAccess(req, tower);
    const administrator = await getActiveAdministrator(tower.id);
    res.render('towers/show', { title: tower.name, tower, administrator });
  } catch (err) {
    next(err);
  }
}

export async function showEdit(req, res, next) {
  try {
    const tower = await findById(req.params.towerId);
    if (!tower) throw new NotFoundError('Torre no encontrada');
    assertTowerAccess(req, tower);
    res.render('towers/form', {
      title: `Editar ${tower.name}`,
      error: null,
      values: tower,
      condominiumId: tower.condominium_id
    });
  } catch (err) {
    next(err);
  }
}

export async function updateOne(req, res, next) {
  try {
    const tower = await findById(req.params.towerId);
    if (!tower) throw new NotFoundError('Torre no encontrada');
    assertTowerAccess(req, tower);
    const parsed = updateTowerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).render('towers/form', {
        title: `Editar ${tower.name}`,
        error: 'Datos invalidos',
        values: { ...tower, ...req.body },
        condominiumId: tower.condominium_id
      });
    }
    const updated = await update(tower.id, parsed.data);
    await createAuditEvent({
      actorUserId: req.session?.user?.id ?? null,
      action: 'towers.update',
      entityType: 'tower',
      entityId: tower.id,
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null
    });
    res.redirect(`/app/torres/${updated.id}`);
  } catch (err) {
    next(err);
  }
}

export async function assignAdministratorAction(req, res, next) {
  try {
    const tower = await findById(req.params.towerId);
    if (!tower) throw new NotFoundError('Torre no encontrada');
    assertTowerAccess(req, tower);
    const parsed = assignAdministratorSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).render('towers/show', {
        title: tower.name,
        tower,
        administrator: await getActiveAdministrator(tower.id),
        error: 'Datos invalidos'
      });
    }
    const result = await assignAdministrator({
      towerId: tower.id,
      userId: parsed.data.userId,
      assignedBy: req.session?.user?.id ?? null
    });
    await createAuditEvent({
      actorUserId: req.session?.user?.id ?? null,
      action: 'towers.assign_administrator',
      entityType: 'tower',
      entityId: tower.id,
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
      success: true
    });
    res.redirect(`/app/torres/${result.towerId}`);
  } catch (err) {
    next(err);
  }
}