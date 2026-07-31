import { Router } from 'express';
import { requireAuth } from '../../middleware/authentication.js';
import { requirePermission } from '../../middleware/authorization.js';
import {
  listByTowerPage,
  showNew,
  createOne,
  showEdit,
  updateOne
} from './units.controller.js';

export const unitsRoutes = Router();

unitsRoutes.get(
  '/app/torres/:towerId/unidades',
  requireAuth,
  requirePermission('towers.team.read'),
  listByTowerPage
);
unitsRoutes.get(
  '/app/torres/:towerId/unidades/nuevo',
  requireAuth,
  requirePermission('towers.team.manage'),
  showNew
);
unitsRoutes.post(
  '/app/torres/:towerId/unidades',
  requireAuth,
  requirePermission('towers.team.manage'),
  createOne
);
unitsRoutes.get(
  '/app/unidades/:unitId/editar',
  requireAuth,
  requirePermission('towers.team.manage'),
  showEdit
);
unitsRoutes.post(
  '/app/unidades/:unitId',
  requireAuth,
  requirePermission('towers.team.manage'),
  updateOne
);