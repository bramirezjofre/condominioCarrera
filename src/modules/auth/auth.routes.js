import { Router } from 'express';
import { loginRateLimiter } from '../../middleware/rate-limit.js';
import { showLoginPage, postLogin, postLogout } from './auth.controller.js';
import { requireAuth } from '../../middleware/authentication.js';

export const authRoutes = Router();

authRoutes.get('/login', showLoginPage);
authRoutes.post('/login', loginRateLimiter, postLogin);
authRoutes.post('/logout', requireAuth, postLogout);