const { sendError } = require('../utils/response.util');

/**
 * Centralized Application Error Handling Middleware
 */
function errorHandler(err, req, res, next) {
  const isDev = process.env.NODE_ENV === 'development';
  console.error(`[UNHANDLED ERROR] ${req.method} ${req.url}:`, err);

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

