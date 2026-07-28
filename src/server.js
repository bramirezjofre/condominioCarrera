import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { createApp } from './app.js';
import { closePool } from './db/pool.js';

if (env.NODE_ENV === 'test') {
  throw new Error('src/server.js no debe ejecutarse en modo test');
}

const app = createApp();
const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, 'Servidor iniciado');
});

const shutdown = async (signal) => {
  logger.info({ signal }, 'Cerrando servidor');
  server.close(async () => {
    try {
      await closePool();
    } catch (err) {
      logger.error({ err }, 'Error cerrando pool PostgreSQL');
    }
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);