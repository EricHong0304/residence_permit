class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_SERVER_ERROR', details) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    if (details !== undefined) {
      this.details = details;
    }
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
}

function validationError(message, details) {
  return new AppError(message, 400, 'VALIDATION_ERROR', details);
}

function errorHandler(err, req, res, _next) {
  const status = err.statusCode || 500;
  const code = err.code || 'INTERNAL_SERVER_ERROR';

  const payload = {
    error: err.message || 'Internal server error',
    code
  };

  if (err.details !== undefined) {
    payload.details = err.details;
  }

  if (process.env.NODE_ENV === 'development') {
    payload.stack = err.stack;
  }

  res.status(status).json(payload);
}

module.exports = {
  AppError,
  validationError,
  errorHandler
};
