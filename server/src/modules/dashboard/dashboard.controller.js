const dashboardService = require('./dashboard.service');
const { sendSuccess } = require('../../utils/response.util');

class DashboardController {
  async getKpis(req, res, next) {
    try {
      const kpis = await dashboardService.getKpis();
      return sendSuccess(res, kpis, 'Dashboard KPIs retrieved');
    } catch (err) {
      next(err);
    }
  }

  async getAnalytics(req, res, next) {
    try {
      const analytics = await dashboardService.getAnalytics();
      return sendSuccess(res, analytics, 'Dashboard analytics retrieved');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new DashboardController();

