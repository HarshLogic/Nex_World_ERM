const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../../config/prisma');
const env = require('../../config/env');

class AuthService {
  async login(email, password, ipAddress, userAgent) {
    if (!email || !password) {
      const error = new Error('Email and password are required.');
      error.statusCode = 400;
      error.code = 'VALIDATION_ERROR';
      error.isOperational = true;
      throw error;
    }

    const cleanEmail = email.toLowerCase().trim();
    const adminEmail = (env.ADMIN_EMAIL || '').toLowerCase().trim();
    const adminPassword = env.ADMIN_PASSWORD;

    let user;
    try {
      user = await prisma.user.findUnique({
        where: { email: cleanEmail },
      });
    } catch (dbErr) {
      console.error('[AUTH DATABASE ERROR]:', dbErr.message);
      const error = new Error('Database is currently unavailable. Please verify database connection.');
      error.statusCode = 503;
      error.code = 'DATABASE_UNAVAILABLE';
      error.isOperational = true;
      throw error;
    }

    // Auto-bootstrap administrator account if matching environment variables and user not found
    if (!user && adminEmail && cleanEmail === adminEmail && password === adminPassword) {
      try {
        console.log(`[AUTH] Auto-bootstrapping administrator account for "${cleanEmail}"...`);
        const salt = await bcrypt.genSalt(12);
        const passwordHash = await bcrypt.hash(password, salt);
        user = await prisma.user.create({
          data: {
            name: env.ADMIN_NAME || 'Administrator',
            email: cleanEmail,
            passwordHash,
            role: 'ADMIN',
            status: 'ACTIVE',
          },
        });
        console.log(`[AUTH] Administrator account created successfully on login for "${cleanEmail}".`);
      } catch (createErr) {
        console.error('[AUTH AUTO-BOOTSTRAP ERROR]:', createErr.message);
      }
    }

    // If user is admin and ADMIN_PASSWORD in environment was updated, sync password hash
    if (user && adminEmail && cleanEmail === adminEmail && password === adminPassword) {
      try {
        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
          console.log(`[AUTH] Updating password hash to match updated ADMIN_PASSWORD for "${cleanEmail}"...`);
          const salt = await bcrypt.genSalt(12);
          const newPasswordHash = await bcrypt.hash(password, salt);
          await prisma.user.update({
            where: { id: user.id },
            data: { passwordHash: newPasswordHash },
          });
          user.passwordHash = newPasswordHash;
        }
      } catch (syncErr) {
        console.error('[AUTH PASSWORD SYNC ERROR]:', syncErr.message);
      }
    }

    if (!user) {
      const error = new Error('Invalid email or password.');
      error.statusCode = 401;
      error.code = 'INVALID_CREDENTIALS';
      error.isOperational = true;
      throw error;
    }

    if (user.status !== 'ACTIVE') {
      const error = new Error('Account is inactive. Please contact your system administrator.');
      error.statusCode = 403;
      error.code = 'ACCOUNT_INACTIVE';
      error.isOperational = true;
      throw error;
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      const error = new Error('Invalid email or password.');
      error.statusCode = 401;
      error.code = 'INVALID_CREDENTIALS';
      error.isOperational = true;
      throw error;
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN }
    );

    // Record session safely
    try {
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await prisma.session.create({
        data: {
          userId: user.id,
          token,
          ipAddress,
          userAgent,
          expiresAt,
        },
      });
    } catch (_) {}

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  async logout(token) {
    if (token) {
      try {
        await prisma.session.deleteMany({
          where: { token },
        });
      } catch (_) {}
    }
    return true;
  }

  async getCurrentUser(userId) {
    let user;
    try {
      user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
          createdAt: true,
        },
      });
    } catch (dbErr) {
      console.error('[AUTH DB ERROR]:', dbErr.message);
      const error = new Error('Database is currently unavailable. Please verify database connection.');
      error.statusCode = 503;
      error.code = 'DATABASE_UNAVAILABLE';
      error.isOperational = true;
      throw error;
    }

    if (!user) {
      const error = new Error('User not found.');
      error.statusCode = 404;
      error.code = 'NOT_FOUND';
      error.isOperational = true;
      throw error;
    }

    return user;
  }

  async changePassword(userId, currentPassword, newPassword) {
    if (!currentPassword || !newPassword) {
      const error = new Error('Current password and new password are required.');
      error.statusCode = 400;
      error.code = 'VALIDATION_ERROR';
      error.isOperational = true;
      throw error;
    }

    if (newPassword.length < 8) {
      const error = new Error('New password must be at least 8 characters long.');
      error.statusCode = 400;
      error.code = 'VALIDATION_ERROR';
      error.isOperational = true;
      throw error;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      const error = new Error('User not found.');
      error.statusCode = 404;
      error.code = 'NOT_FOUND';
      error.isOperational = true;
      throw error;
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      const error = new Error('Incorrect current password.');
      error.statusCode = 401;
      error.code = 'INVALID_CURRENT_PASSWORD';
      error.isOperational = true;
      throw error;
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return { message: 'Password changed successfully.' };
  }
}

module.exports = new AuthService();
