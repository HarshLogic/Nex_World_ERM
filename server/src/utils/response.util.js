/**
 * Consistent Standardized API Response Utilities
 */

/**
 * Sends a successful JSON response.
 * @param {import('express').Response} res
 * @param {any} data
 * @param {string} [message="Success"]
 * @param {number} [statusCode=200]
 */
function sendSuccess(res, data = {}, message = 'Success', statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

/**
 * Sends a standardized error JSON response.
 * @param {import('express').Response} res
 * @param {string} message
 * @param {number} [statusCode=500]
 * @param {string} [code="INTERNAL_ERROR"]
 * @param {Array<any>} [errors=[]]
 */
function sendError(res, message = 'An error occurred', statusCode = 500, code = 'INTERNAL_ERROR', errors = []) {
  return res.status(statusCode).json({
    success: false,
    message,
    code,
    ...(errors.length > 0 ? { errors } : {}),
  });
}

module.exports = {
  sendSuccess,
  sendError,
};

