import { Router } from 'express';
import { requireAuth } from '../../middleware/authentication.js';
import { requirePermission } from '../../middleware/authorization.js';
import {
  listPage,
  showNew,
  createOne,
  showOne,
  showEdit,
  updateOne
} from './people.controller.js';

export const peopleRoutes = Router();

peopleRoutes.get('/app/personas', requireAuth, requirePermission('users.read'), listPage);
peopleRoutes.get('/app/personas/nuevo', requireAuth, requirePermission('users.create'), showNew);
peopleRoutes.post('/app/personas', requireAuth, requirePermission('users.create'), createOne);
peopleRoutes.get('/app/personas/:personId', requireAuth, requirePermission('users.read'), showOne);
peopleRoutes.get(
  '/app/personas/:personId/editar',
  requireAuth,
  requirePermission('users.update'),
  showEdit
);
peopleRoutes.post('/app/personas/:personId', requireAuth, requirePermission('users.update'), updateOne);