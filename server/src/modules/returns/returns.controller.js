const returnsService = require('./returns.service');
const { sendSuccess, sendError } = require('../../utils/response.util');

class ReturnsController {
  async process(req, res, next) {
    try {
      const { originalSaleId, items, refundMethod, reason } = req.body;
      if (!originalSaleId || !items || !Array.isArray(items)) {
        return sendError(res, 'Original sale ID and items array are required', 400, 'VALIDATION_ERROR');
      }

      const result = await returnsService.processReturn({ originalSaleId, items, refundMethod, reason }, req.user.id);
      return sendSuccess(res, result, 'Return processed successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  async list(req, res, next) {
    try {
      const { page, limit } = req.query;
      const result = await returnsService.listReturns({ page, limit });
      return sendSuccess(res, result, 'Returns retrieved successfully');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ReturnsController();

