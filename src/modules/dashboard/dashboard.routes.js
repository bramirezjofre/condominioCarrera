import { Router } from 'express';
import { requireAuth } from '../../middleware/authentication.js';
import { showDashboard } from './dashboard.controller.js';

export const dashboardRoutes = Router();

dashboardRoutes.get('/app', requireAuth, showDashboard);