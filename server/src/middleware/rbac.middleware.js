const { sendError } = require('../utils/response.util');

/**
 * Role-Based Access Control (RBAC) Middleware
 * Restricts access based on authenticated user's role.
 * @param {Array<string>|string} allowedRoles - e.g. ['ADMIN'] or 'ADMIN'
 */
function authorize(allowedRoles = []) {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return sendError(res, 'User identity not found on request context', 401, 'UNAUTHORIZED');
    }

    if (!roles.includes(req.user.role)) {
      return sendError(
        res,
        'Access denied: You do not possess the required permissions to perform this operation.',
        403,
        'FORBIDDEN'
      );
    }

    next();
  };
}

module.exports = {
  authorize,
};

