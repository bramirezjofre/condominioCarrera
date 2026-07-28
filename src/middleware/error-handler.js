import { logger } from '../config/logger.js';

export function notFoundHandler(req, res, _next) {
  res.status(404).render('errors/404', { title: 'No encontrado', path: req.path });
}

export function errorHandler(err, req, res, _next) {
  const requestId = req.id ?? null;
  const status = err.status ?? err.statusCode ?? 500;

  logger.error(
    { err, requestId, path: req.path, method: req.method, status },
    'Error en la solicitud'
  );

  if (req.accepts('html')) {
    return res.status(status).render('errors/error', {
      title: 'Error',
      message: status >= 500 ? 'Error interno del servidor' : err.message,
      requestId
    });
  }

  return res.status(status).json({
    error: {
      code: err.code ?? 'INTERNAL_ERROR',
      message: status >= 500 ? 'Error interno del servidor' : err.message,
      requestId
    }
  });
}