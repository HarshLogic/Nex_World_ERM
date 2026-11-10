const bcrypt = require('bcrypt');
const prisma = require('../../config/prisma');
const { logActivity } = require('../../utils/audit.util');

class UsersService {
  async listUsers({ page = 1, limit = 20 }) {
    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        skip,
        take,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          createdAt: true,
          _count: { select: { sales: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count(),
    ]);

    return {
      users,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        totalCount,
        totalPages: Math.ceil(totalCount / take),
      },
    };
  }

  async createUser(data, adminUserId) {
    const { name, email, password, role = 'USER', status = 'ACTIVE' } = data;

    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existing) {
      const err = new Error('A user with this email address already exists.');
      err.statusCode = 409;
      err.isOperational = true;
      throw err;
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        passwordHash,
        role,
        status,
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

    await logActivity({
      prisma,
      userId: adminUserId,
      action: 'CREATE_USER',
      module: 'USERS',
      description: `Created user account ${user.email} with role ${user.role}`,
      entityId: user.id,
    });

    return user;
  }

  async updateUser(id, data, adminUserId) {
    // Prevent self-lockout or self-demotion
    if (id === adminUserId) {
      if (data.status === 'INACTIVE') {
        const err = new Error('You cannot deactivate your own administrative account.');
        err.statusCode = 400;
        err.isOperational = true;
        throw err;
      }
      if (data.role && data.role !== 'ADMIN') {
        const err = new Error('You cannot demote your own administrative role.');
        err.statusCode = 400;
        err.isOperational = true;
        throw err;
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        name: data.name ? data.name.trim() : undefined,
        role: data.role,
        status: data.status,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
      },
    });

    await logActivity({
      prisma,
      userId: adminUserId,
      action: 'UPDATE_USER',
      module: 'USERS',
      description: `Updated user account ${updated.email} (Role: ${updated.role}, Status: ${updated.status})`,
      entityId: updated.id,
    });

    return updated;
  }

  async resetPassword(id, newPassword, adminUserId) {
    if (!newPassword || newPassword.length < 6) {
      const err = new Error('Password must be at least 6 characters long.');
      err.statusCode = 400;
      err.isOperational = true;
      throw err;
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id },
      data: { passwordHash },
    });

    await logActivity({
      prisma,
      userId: adminUserId,
      action: 'RESET_PASSWORD',
      module: 'USERS',
      description: `Reset password for user ${id}`,
      entityId: id,
    });

    return { message: 'Password reset successfully' };
  }
}

module.exports = new UsersService();

