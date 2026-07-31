import { Router } from 'express';
import { requireAuth } from '../../middleware/authentication.js';
import { requirePermission } from '../../middleware/authorization.js';
import {
  listJson,
  listPage,
  showNew,
  createOne,
  showOne,
  showEdit,
  updateOne,
  assignAdministratorAction
} from './towers.controller.js';

export const towersRoutes = Router();

towersRoutes.get('/app/torres', requireAuth, listPage);
towersRoutes.get('/app/torres.json', requireAuth, listJson);
towersRoutes.get('/app/torres/nuevo', requireAuth, requirePermission('users.create'), showNew);
towersRoutes.post('/app/torres', requireAuth, requirePermission('users.create'), createOne);
towersRoutes.get(
  '/app/torres/:towerId',
  requireAuth,
  requirePermission('towers.team.read'),
  showOne
);
towersRoutes.get(
  '/app/torres/:towerId/editar',
  requireAuth,
  requirePermission('towers.team.manage'),
  showEdit
);
towersRoutes.post(
  '/app/torres/:towerId',
  requireAuth,
  requirePermission('towers.team.manage'),
  updateOne
);
towersRoutes.post(
  '/app/torres/:towerId/administrador',
  requireAuth,
  requirePermission('towers.assign_administrator'),
  assignAdministratorAction
);