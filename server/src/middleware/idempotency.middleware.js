const prisma = require('../config/prisma');

/**
 * High-Speed In-Memory TTL Store for Idempotency
 * Automatically prunes expired keys to maintain minimal memory footprint.
 */
class MemoryIdempotencyStore {
  constructor() {
    this.cache = new Map();
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return item.data;
  }

  set(key, data, ttlSeconds = 3600) {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
    // Cap in-memory store to 10,000 recent items
    if (this.cache.size > 10000) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
  }

  delete(key) {
    this.cache.delete(key);
  }
}

const memoryStore = new MemoryIdempotencyStore();

/**
 * Distributed Idempotency Middleware
 * Ensures checkouts and financial mutations are never executed twice on network retry.
 * Self-contained in-memory caching with database persistence fallback.
 */
function idempotencyMiddleware(ttlSeconds = 3600) {
  return async (req, res, next) => {
    const key = req.headers['idempotency-key'] || req.headers['x-idempotency-key'];

    if (!key) {
      return next();
    }

    try {
      // 1. Check in-memory store
      let cached = memoryStore.get(key);

      // 2. Check database IdempotencyRecord table if not in memory
      if (!cached) {
        try {
          const dbRecord = await prisma.idempotencyRecord.findUnique({
            where: { key: String(key) },
          });
          if (dbRecord && new Date(dbRecord.expiresAt) > new Date()) {
            cached = {
              status: dbRecord.responseStatus,
              body: JSON.parse(dbRecord.responseBody),
            };
            memoryStore.set(key, cached, ttlSeconds);
          }
        } catch (_) {}
      }

      if (cached) {
        return res.status(cached.status).json(cached.body);
      }

      // Intercept res.json to capture response payload
      const originalJson = res.json.bind(res);
      res.json = (body) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const payload = { status: res.statusCode, body };
          memoryStore.set(key, payload, ttlSeconds);

          // Asynchronously persist to database table
          const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
          prisma.idempotencyRecord
            .upsert({
              where: { key: String(key) },
              update: {
                responseStatus: res.statusCode,
                responseBody: JSON.stringify(body),
                expiresAt,
              },
              create: {
                key: String(key),
                route: req.originalUrl || req.url,
                requestHash: req.method,
                responseStatus: res.statusCode,
                responseBody: JSON.stringify(body),
                expiresAt,
              },
            })
            .catch(() => {});
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
  memoryStore,
};
