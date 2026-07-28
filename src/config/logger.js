import pino from 'pino';
import { isProduction } from './env.js';

export const logger = pino({
  level: isProduction ? 'info' : 'debug',
  base: { service: 'condominio-jmc' },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      'DATABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'SESSION_SECRET',
      'password',
      'password_hash',
      '*.password',
      '*.password_hash'
    ],
    censor: '[REDACTED]'
  },
  transport: isProduction
    ? undefined
    : {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'SYS:HH:MM:ss.l' }
      }
});