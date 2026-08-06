import rateLimit from 'express-rate-limit';
import { isTest } from '../config/env.js';

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skip: () => isTest,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Demasiados intentos. Intente nuevamente en unos minutos.'
});

export const generalRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false
});
