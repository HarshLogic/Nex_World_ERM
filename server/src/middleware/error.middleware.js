const { sendError } = require('../utils/response.util');

/**
 * Centralized Application Error Handling Middleware
 * Ensures operational, validation, and CORS errors return structured responses.
 */
function errorHandler(err, req, res, next) {
  const isDev = process.env.NODE_ENV === 'development';
  console.error(`[UNHANDLED ERROR] ${req.method} ${req.url}:`, err);

  if (err.message && err.message.toLowerCase().includes('cors')) {
    return sendError(res, err.message, 403, 'CORS_FORBIDDEN');
  }

  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : 'Internal Server Error';
  const code = err.code || 'INTERNAL_ERROR';

  return sendError(
    res,
    message,
    statusCode,
    code,
    isDev && err.stack ? [err.stack] : []
  );
}

module.exports = {
  errorHandler,
};
