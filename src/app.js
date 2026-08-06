import express from 'express';
import helmet from 'helmet';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pinoHttp from 'pino-http';

import { isProduction, env } from './config/env.js';
import { logger } from './config/logger.js';
import { sessionMiddleware, buildSessionMiddleware } from './config/session.js';
import { isTest } from './config/env.js';
import { pingDatabase } from './db/health.js';
import { requestId } from './middleware/request-id.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { demoRoutes } from './modules/demo/demo.routes.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { NAV_GROUPS, MOBILE_NAV, breadcrumbsFor } from './shared/navigation.js';

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
  app.use(isTest || env.DATA_MODE === 'demo' ? buildSessionMiddleware() : sessionMiddleware);

  app.use((req, res, next) => {
    res.locals.user = req.session?.user ?? {};
    res.locals.NAV_GROUPS = NAV_GROUPS;
    res.locals.MOBILE_NAV = MOBILE_NAV;
    res.locals.ACTIVEPATH = req.path;
    res.locals.crumbs = breadcrumbsFor(req.path);
    res.locals.isDemoBanner = env.DATA_MODE === 'demo';
    next();
  });

  app.get('/health/live', (_req, res) => res.status(200).json({ status: 'ok' }));

  app.get('/health/ready', async (_req, res) => {
    if (env.DATA_MODE === 'demo') {
      return res.status(200).json({ status: 'ready' });
    }

    try {
      const ok = await pingDatabase();
      res.status(ok ? 200 : 503).json({ status: ok ? 'ready' : 'degraded' });
    } catch (err) {
      logger.error({ err }, 'health/ready fallo');
      res.status(503).json({ status: 'degraded' });
    }
  });

  app.use(authRoutes);
  app.use(demoRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
