import { createAuditEvent } from '../auth/auth.repository.js';
import { findById, listAll, create, update } from './condominiums.repository.js';
import { createCondominiumSchema, updateCondominiumSchema } from './condominiums.schema.js';
import { ValidationError, ForbiddenError } from '../../shared/errors/index.js';

export async function list(req, res) {
  const items = await listAll();
  res.json({ data: items });
}

export async function getOne(req, res) {
  const item = await findById(req.params.id);
  if (!item) {
    return res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
  }
  res.json({ data: item });
}

export async function showNew(req, res) {
  res.render('condominiums/form', { title: 'Nuevo condominio', error: null, values: {} });
}

export async function createOne(req, res, next) {
  try {
    const parsed = createCondominiumSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).render('condominiums/form', {
        title: 'Nuevo condominio',
        error: 'Datos invalidos',
        values: req.body
      });
    }
    const created = await create(parsed.data);
    await createAuditEvent({
      actorUserId: req.session?.user?.id ?? null,
      action: 'condominiums.create',
      entityType: 'condominium',
      entityId: created.id,
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null
    });
    res.redirect(`/app/condominios/${created.id}`);
  } catch (err) {
    return next(err);
  }
}

export async function showEdit(req, res, next) {
  try {
    const item = await findById(req.params.id);
    if (!item) throw new ForbiddenError('No encontrado');
    res.render('condominiums/form', {
      title: 'Editar condominio',
      error: null,
      values: item
    });
  } catch (err) {
    next(err);
  }
}

export async function updateOne(req, res, next) {
  try {
    const parsed = updateCondominiumSchema.safeParse(req.body);
    if (!parsed.success) {
      const item = await findById(req.params.id);
      return res.status(400).render('condominiums/form', {
        title: 'Editar condominio',
        error: 'Datos invalidos',
        values: { ...item, ...req.body }
      });
    }
    const updated = await update(req.params.id, parsed.data);
    if (!updated) {
      throw new ValidationError({ id: 'No encontrado' });
    }
    await createAuditEvent({
      actorUserId: req.session?.user?.id ?? null,
      action: 'condominiums.update',
      entityType: 'condominium',
      entityId: updated.id,
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null
    });
    res.redirect(`/app/condominios/${updated.id}`);
  } catch (err) {
    next(err);
  }
}