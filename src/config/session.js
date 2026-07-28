import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { pool } from '../db/pool.js';
import { env, isProduction } from './env.js';

const PgStore = connectPgSimple(session);

export const sessionMiddleware = session({
  name: env.SESSION_COOKIE_NAME,
  secret: env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  store: new PgStore({
    pool,
    tableName: 'session',
    createTableIfMissing: false
  }),
  cookie: {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 8 * 60 * 60 * 1000
  }
});