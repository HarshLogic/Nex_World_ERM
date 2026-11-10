const salesService = require('./sales.service');
const { sendSuccess } = require('../../utils/response.util');

class SalesController {
  async list(req, res, next) {
    try {
      const { invoiceNumber, customerId, paymentMethod, startDate, endDate, page, limit } = req.query;
      const result = await salesService.listSales({ invoiceNumber, customerId, paymentMethod, startDate, endDate, page, limit });
      return sendSuccess(res, result, 'Sales retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const sale = await salesService.getSaleById(req.params.id);
      return sendSuccess(res, sale, 'Sale details retrieved');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new SalesController();

