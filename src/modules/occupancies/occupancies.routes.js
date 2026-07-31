import { Router } from 'express';
import { requireAuth } from '../../middleware/authentication.js';
import { requirePermission } from '../../middleware/authorization.js';
import {
  listByUnitPage,
  showNew,
  createOne,
  endOne
} from './occupancies.controller.js';

export const occupanciesRoutes = Router();

occupanciesRoutes.get(
  '/app/unidades/:unitId/ocupaciones',
  requireAuth,
  requirePermission('users.read'),
  listByUnitPage
);
occupanciesRoutes.get(
  '/app/unidades/:unitId/ocupaciones/nuevo',
  requireAuth,
  requirePermission('users.update'),
  showNew
);
occupanciesRoutes.post(
  '/app/unidades/:unitId/ocupaciones',
  requireAuth,
  requirePermission('users.update'),
  createOne
);
occupanciesRoutes.post(
  '/app/ocupaciones/:occupancyId/finalizar',
  requireAuth,
  requirePermission('users.update'),
  endOne
);