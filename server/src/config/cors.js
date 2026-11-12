const env = require('./env');

/**
 * Production-Ready CORS Configuration
 * Securely restricts cross-origin access while enabling authenticated cross-site cookie/JWT communication.
 */

function parseAllowedOrigins() {
  const envOrigins = (env.CORS_ORIGIN || process.env.CORS_ORIGIN || '')
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, '').toLowerCase())
    .filter(Boolean);

  // Default allowed origins (Production Frontend + Local Development)
  const defaults = [
    'https://nexperfumeerp.up.railway.app',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ];

  for (const d of defaults) {
    const clean = d.toLowerCase();
    if (!envOrigins.includes(clean)) {
      envOrigins.push(clean);
    }
  }

  return envOrigins;
}

const corsOptions = {
  origin: (origin, callback) => {
    // 1. Allow server-to-server, curl, health checks, mobile apps, or requests with no Origin header
    if (!origin) {
      return callback(null, true);
    }

    const cleanOrigin = origin.trim().replace(/\/+$/, '').toLowerCase();
    const allowedOrigins = parseAllowedOrigins();

    // 2. Exact match against allowlist
    if (allowedOrigins.includes(cleanOrigin)) {
      return callback(null, true);
    }

    // 3. In non-production, allow localhost / 127.0.0.1 on any port
    if (env.NODE_ENV !== 'production') {
      try {
        const url = new URL(origin);
        if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
          return callback(null, true);
        }
      } catch (_) {}
    }

    // 4. Reject unapproved origin
    console.warn(`[CORS REJECTED]: Origin "${origin}" not in allowed origins list.`);
    return callback(new Error(`CORS Error: Origin ${origin} is not allowed`));
  },

  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Idempotency-Key',
    'x-idempotency-key',
  ],
  exposedHeaders: ['Set-Cookie'],
  optionsSuccessStatus: 200, // 200 for maximum compatibility with reverse proxies
  maxAge: 86400, // Cache preflight for 24 hours
};

module.exports = {
  corsOptions,
  parseAllowedOrigins,
};
