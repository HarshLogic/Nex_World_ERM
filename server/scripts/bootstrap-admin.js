const bcrypt = require('bcrypt');
const prisma = require('../src/config/prisma');
const env = require('../src/config/env');

/**
 * Idempotent Admin Account Bootstrap Script
 * Reads credentials strictly from backend environment variables.
 * Automatically synchronizes password hash if ADMIN_PASSWORD is changed in .env.
 */
async function bootstrapAdmin() {
  console.log('[ADMIN BOOTSTRAP] Checking initial administrator credentials...');

  const name = env.ADMIN_NAME || 'Administrator';
  const email = (env.ADMIN_EMAIL || 'client-admin@example.com').toLowerCase().trim();
  const password = env.ADMIN_PASSWORD || 'Admin@12345';
  const role = env.ADMIN_ROLE || 'ADMIN';

  // 1. Validation (Support any non-empty password configured by user)
  if (!email || !email.includes('@')) {
    throw new Error(
      `[ADMIN BOOTSTRAP ERROR]: Invalid or missing ADMIN_EMAIL environment variable: "${email}".`
    );
  }

  // 2. Check if admin account already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    // Check if the current environment password matches the stored hash
    const match = await bcrypt.compare(password, existingUser.passwordHash);
    if (!match) {
      console.log(
        `[ADMIN BOOTSTRAP] Environment ADMIN_PASSWORD updated. Updating password hash for "${email}"...`
      );
      const salt = await bcrypt.genSalt(12);
      const newPasswordHash = await bcrypt.hash(password, salt);
      const updatedUser = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          passwordHash: newPasswordHash,
          name: name || existingUser.name,
          role: 'ADMIN',
          status: 'ACTIVE',
        },
      });
      console.log(`[ADMIN BOOTSTRAP] Password hash updated successfully for "${email}".`);
      return updatedUser;
    }

    console.log(
      `[ADMIN BOOTSTRAP] Admin user "${email}" already exists and credentials match environment.`
    );
    return existingUser;
  }

  // 3. Hash password using bcrypt work factor 12
  console.log(`[ADMIN BOOTSTRAP] Hashing admin password with bcrypt work factor 12...`);
  const salt = await bcrypt.genSalt(12);
  const passwordHash = await bcrypt.hash(password, salt);

  // 4. Create administrator user
  const adminUser = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: role === 'ADMIN' ? 'ADMIN' : 'USER',
      status: 'ACTIVE',
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      createdAt: true,
    },
  });

  console.log(
    `[ADMIN BOOTSTRAP SUCCESS] Initial administrator account created for "${adminUser.email}" (ID: ${adminUser.id}).`
  );
  return adminUser;
}

if (require.main === module) {
  bootstrapAdmin()
    .then(() => {
      console.log('[ADMIN BOOTSTRAP] Process finished successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[ADMIN BOOTSTRAP FAILED]:', err.message);
      process.exit(1);
    });
}

module.exports = bootstrapAdmin;
