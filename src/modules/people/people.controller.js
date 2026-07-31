import { findById, search, create, update } from './people.repository.js';
import { createPersonSchema, updatePersonSchema } from './people.schema.js';
import { createAuditEvent } from '../auth/auth.repository.js';
import { NotFoundError } from '../../shared/errors/index.js';

export async function listPage(req, res) {
  const searchTerm = req.query.search?.toString() ?? '';
  const people = await search({
    condominiumId: req.session?.user?.condominiumId,
    search: searchTerm,
    limit: 100,
    offset: 0
  });
  res.render('people/index', { title: 'Personas', people, search: searchTerm });
}

export async function showNew(req, res) {
  res.render('people/form', { title: 'Nueva persona', error: null, values: {} });
}

export async function createOne(req, res, next) {
  try {
    const parsed = createPersonSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).render('people/form', {
        title: 'Nueva persona',
        error: 'Datos invalidos',
        values: req.body
      });
    }
    const person = await create(parsed.data);
    await createAuditEvent({
      actorUserId: req.session?.user?.id ?? null,
      action: 'people.create',
      entityType: 'person',
      entityId: person.id,
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null
    });
    res.redirect(`/app/personas/${person.id}`);
  } catch (err) {
    next(err);
  }
}

export async function showOne(req, res, next) {
  try {
    const person = await findById(req.params.personId);
    if (!person) throw new NotFoundError('Persona no encontrada');
    res.render('people/show', { title: person.full_name, person });
  } catch (err) {
    next(err);
  }
}

export async function showEdit(req, res, next) {
  try {
    const person = await findById(req.params.personId);
    if (!person) throw new NotFoundError('Persona no encontrada');
    res.render('people/form', { title: 'Editar persona', error: null, values: person });
  } catch (err) {
    next(err);
  }
}

export async function updateOne(req, res, next) {
  try {
    const person = await findById(req.params.personId);
    if (!person) throw new NotFoundError('Persona no encontrada');
    const parsed = updatePersonSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).render('people/form', {
        title: 'Editar persona',
        error: 'Datos invalidos',
        values: { ...person, ...req.body }
      });
    }
    const updated = await update(person.id, parsed.data);
    await createAuditEvent({
      actorUserId: req.session?.user?.id ?? null,
      action: 'people.update',
      entityType: 'person',
      entityId: person.id,
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null
    });
    res.redirect(`/app/personas/${updated.id}`);
  } catch (err) {
    next(err);
  }
}