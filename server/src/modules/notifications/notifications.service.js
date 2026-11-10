const prisma = require('../../config/prisma');

class NotificationsService {
  async listNotifications({ unreadOnly = false, limit = 20 }) {
    const where = {};
    if (unreadOnly) where.isRead = false;

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where: { isRead: false } }),
    ]);

    return {
      notifications,
      unreadCount,
    };
  }

  async markAsRead(id) {
    return await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async markAllAsRead() {
    return await prisma.notification.updateMany({
      where: { isRead: false },
      data: { isRead: true },
    });
  }
}

module.exports = new NotificationsService();

