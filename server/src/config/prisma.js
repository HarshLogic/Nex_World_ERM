let prismaClientInstance = null;

try {
  const { PrismaClient } = require('@prisma/client');
  prismaClientInstance = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
} catch (e) {
  // If Prisma client is not yet generated, provide a proxy that logs warnings
  console.warn('[PRISMA WARNING]: @prisma/client not yet generated. Run "npx prisma generate".');
  prismaClientInstance = new Proxy({}, {
    get: (_target, prop) => {
      return new Proxy({}, {
        get: (_subTarget, method) => {
          return async (...args) => {
            console.warn(`[PRISMA MOCK]: Called prisma.${String(prop)}.${String(method)} with`, args);
            return null;
          };
        },
      });
    },
  });
}

module.exports = prismaClientInstance;

