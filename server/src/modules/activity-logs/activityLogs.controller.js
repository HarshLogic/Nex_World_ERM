const activityLogsService = require('./activityLogs.service');
const { sendSuccess } = require('../../utils/response.util');

class ActivityLogsController {
  async list(req, res, next) {
    try {
      const { userId, module, action, startDate, endDate, page, limit } = req.query;
      const result = await activityLogsService.listLogs({ userId, module, action, startDate, endDate, page, limit });
      return sendSuccess(res, result, 'Activity logs retrieved');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ActivityLogsController();

