import express from 'express';
import helmet from 'helmet';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pinoHttp from 'pino-http';

import { isProduction } from './config/env.js';
import { logger } from './config/logger.js';
import { sessionMiddleware } from './config/session.js';
import { pingDatabase } from './db/health.js';
import { requestId } from './middleware/request-id.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { dashboardRoutes } from './modules/dashboard/dashboard.routes.js';
import { condominiumsRoutes } from './modules/condominiums/condominiums.routes.js';
import { towersRoutes } from './modules/towers/towers.routes.js';
import { unitsRoutes } from './modules/units/units.routes.js';
import { peopleRoutes } from './modules/people/people.routes.js';
import { occupanciesRoutes } from './modules/occupancies/occupancies.routes.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));

  app.use(requestId);
  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => req.id,
      customLogLevel: (_req, res, err) => {
        if (err || res.statusCode >= 500) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      }
    })
  );
  app.use(
    helmet({
      contentSecurityPolicy: isProduction ? undefined : false
    })
  );
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.static(path.join(__dirname, 'public'), { index: false }));
  app.use(sessionMiddleware);

  app.get('/health/live', (_req, res) => res.status(200).json({ status: 'ok' }));

  app.get('/health/ready', async (_req, res) => {
    try {
      const ok = await pingDatabase();
      res.status(ok ? 200 : 503).json({ status: ok ? 'ready' : 'degraded' });
    } catch (err) {
      logger.error({ err }, 'health/ready fallo');
      res.status(503).json({ status: 'degraded' });
    }
  });

  app.use(authRoutes);
  app.use(dashboardRoutes);
  app.use(condominiumsRoutes);
  app.use(towersRoutes);
  app.use(unitsRoutes);
  app.use(peopleRoutes);
  app.use(occupanciesRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}