const authService = require('./auth.service');
const env = require('../../config/env');
const { sendSuccess, sendError } = require('../../utils/response.util');

class AuthController {
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return sendError(res, 'Email and password are required', 400, 'VALIDATION_ERROR');
      }

      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const result = await authService.login(email, password, ipAddress, userAgent);

      // Set HTTP-only secure cookie (cross-site compatible for Railway/cloud deployments)
      const isCrossSite = env.NODE_ENV === 'production' || Boolean(env.COOKIE_SECURE);
      res.cookie(env.COOKIE_NAME, result.token, {
        httpOnly: true,
        secure: isCrossSite,
        sameSite: isCrossSite ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      return sendSuccess(res, result, 'Login successful');
    } catch (err) {
      next(err);
    }
  }

  async logout(req, res, next) {
    try {
      const token = req.cookies[env.COOKIE_NAME] || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
      await authService.logout(token);

      const isCrossSite = env.NODE_ENV === 'production' || Boolean(env.COOKIE_SECURE);
      res.clearCookie(env.COOKIE_NAME, {
        httpOnly: true,
        secure: isCrossSite,
        sameSite: isCrossSite ? 'none' : 'lax',
      });

      return sendSuccess(res, null, 'Logged out successfully');
    } catch (err) {
      next(err);
    }
  }

  async me(req, res, next) {
    try {
      const user = await authService.getCurrentUser(req.user.id);
      return sendSuccess(res, user, 'Profile retrieved');
    } catch (err) {
      next(err);
    }
  }

  async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;
      const result = await authService.changePassword(req.user.id, currentPassword, newPassword);
      return sendSuccess(res, result, 'Password changed successfully');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AuthController();

