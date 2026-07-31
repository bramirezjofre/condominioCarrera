import { Router } from 'express';
import { requireAuth } from '../../middleware/authentication.js';
import { requirePermission } from '../../middleware/authorization.js';
import {
  list,
  getOne,
  showNew,
  createOne,
  showEdit,
  updateOne
} from './condominiums.controller.js';

export const condominiumsRoutes = Router();

condominiumsRoutes.get('/app/condominios', requireAuth, requirePermission('users.read'), list);
condominiumsRoutes.get(
  '/app/condominios/nuevo',
  requireAuth,
  requirePermission('users.create'),
  showNew
);
condominiumsRoutes.post(
  '/app/condominios',
  requireAuth,
  requirePermission('users.create'),
  createOne
);
condominiumsRoutes.get(
  '/app/condominios/:id/editar',
  requireAuth,
  requirePermission('users.update'),
  showEdit
);
condominiumsRoutes.post(
  '/app/condominios/:id',
  requireAuth,
  requirePermission('users.update'),
  updateOne
);
condominiumsRoutes.get(
  '/app/condominios/:id',
  requireAuth,
  requirePermission('users.read'),
  getOne
);