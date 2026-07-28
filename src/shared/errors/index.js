export class HttpError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export class ValidationError extends HttpError {
  constructor(details) {
    super(400, 'VALIDATION_ERROR', 'Datos invalidos', details);
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = 'No autorizado') {
    super(401, 'UNAUTHORIZED', message);
  }
}

export class ForbiddenError extends HttpError {
  constructor(message = 'Acceso denegado') {
    super(403, 'FORBIDDEN', message);
  }
}

export class NotFoundError extends HttpError {
  constructor(message = 'Recurso no encontrado') {
    super(404, 'NOT_FOUND', message);
  }
}