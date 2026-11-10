const settingsService = require('./settings.service');
const { sendSuccess } = require('../../utils/response.util');

class SettingsController {
  async get(req, res, next) {
    try {
      const settings = await settingsService.getSettings();
      return sendSuccess(res, settings, 'Business settings retrieved');
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const settings = await settingsService.updateSettings(req.body, req.user.id);
      return sendSuccess(res, settings, 'Settings updated successfully');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new SettingsController();

