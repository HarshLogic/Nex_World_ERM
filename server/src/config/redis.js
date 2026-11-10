const env = require('./env');

class InMemoryRedisFallback {
  constructor() {
    this.store = new Map();
  }

  async get(key) {
    const item = this.store.get(key);
    if (!item) return null;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key, value, mode, duration) {
    let expiresAt = null;
    if (mode === 'EX' && duration) {
      expiresAt = Date.now() + duration * 1000;
    }
    this.store.set(key, { value, expiresAt });
    return 'OK';
  }

  async del(key) {
    return this.store.delete(key) ? 1 : 0;
  }

  async ping() {
    return 'PONG';
  }
}

let redisClient = null;

try {
  const Redis = require('ioredis');
  redisClient = new Redis({
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD,
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    retryStrategy: () => null, // Do not infinite loop if Redis isn't running
  });

  redisClient.on('error', (err) => {
    // Suppress connection error spam when running in dev without Redis
  });
} catch (e) {
  redisClient = new InMemoryRedisFallback();
}

// Wrap with fallback logic
const redisWrapper = {
  async get(key) {
    try {
      if (redisClient.status === 'ready') {
        return await redisClient.get(key);
      }
    } catch (_) {}
    return await fallbackStore.get(key);
  },

  async set(key, value, mode, duration) {
    try {
      if (redisClient.status === 'ready') {
        return await redisClient.set(key, value, mode, duration);
      }
    } catch (_) {}
    return await fallbackStore.set(key, value, mode, duration);
  },

  async del(key) {
    try {
      if (redisClient.status === 'ready') {
        return await redisClient.del(key);
      }
    } catch (_) {}
    return await fallbackStore.del(key);
  },

  async ping() {
    try {
      if (redisClient.status === 'ready') {
        return await redisClient.ping();
      }
    } catch (_) {}
    return 'PONG';
  },
};

const fallbackStore = new InMemoryRedisFallback();

module.exports = redisWrapper;

