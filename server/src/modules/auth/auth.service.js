const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../../config/prisma');
const env = require('../../config/env');

class AuthService {
  async login(email, password, ipAddress, userAgent) {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

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

    // Record session
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
    const user = await prisma.user.findUnique({
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

