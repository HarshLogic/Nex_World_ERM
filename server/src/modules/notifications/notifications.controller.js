const notificationsService = require('./notifications.service');
const { sendSuccess } = require('../../utils/response.util');

class NotificationsController {
  async list(req, res, next) {
    try {
      const { unreadOnly, limit } = req.query;
      const result = await notificationsService.listNotifications({
        unreadOnly: unreadOnly === 'true',
        limit,
      });
      return sendSuccess(res, result, 'Notifications retrieved');
    } catch (err) {
      next(err);
    }
  }

  async markAsRead(req, res, next) {
    try {
      const notification = await notificationsService.markAsRead(req.params.id);
      return sendSuccess(res, notification, 'Notification marked as read');
    } catch (err) {
      next(err);
    }
  }

  async markAllAsRead(req, res, next) {
    try {
      await notificationsService.markAllAsRead();
      return sendSuccess(res, null, 'All notifications marked as read');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new NotificationsController();

