const redis = require('../config/redis');
const { sendError } = require('../utils/response.util');

/**
 * Distributed Idempotency Middleware
 * Ensures checkouts and financial mutations are never executed twice on network retry.
 */
function idempotencyMiddleware(ttlSeconds = 3600) {
  return async (req, res, next) => {
    const key = req.headers['idempotency-key'] || req.headers['x-idempotency-key'];

    if (!key) {
      return next();
    }

    try {
      const cached = await redis.get(`idempotency:${key}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        return res.status(parsed.status).json(parsed.body);
      }

      // Intercept res.json to capture response payload
      const originalJson = res.json.bind(res);
      res.json = (body) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          redis.set(
            `idempotency:${key}`,
            JSON.stringify({ status: res.statusCode, body }),
            'EX',
            ttlSeconds
          ).catch((e) => console.error('[IDEMPOTENCY CACHE ERROR]:', e));
        }
        return originalJson(body);
      };

      next();
    } catch (err) {
      console.error('[IDEMPOTENCY MIDDLEWARE ERROR]:', err);
      next();
    }
  };
}

module.exports = {
  idempotencyMiddleware,
};

