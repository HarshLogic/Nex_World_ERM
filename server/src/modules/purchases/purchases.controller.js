const purchasesService = require('./purchases.service');
const { sendSuccess, sendError } = require('../../utils/response.util');

class PurchasesController {
  async list(req, res, next) {
    try {
      const { supplierId, status, page, limit } = req.query;
      const result = await purchasesService.listPurchaseOrders({ supplierId, status, page, limit });
      return sendSuccess(res, result, 'Purchase orders retrieved');
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const po = await purchasesService.getPurchaseOrderById(req.params.id);
      return sendSuccess(res, po, 'Purchase order retrieved');
    } catch (err) {
      next(err);
    }
  }

  async create(req, res, next) {
    try {
      const { supplierId, items } = req.body;
      if (!supplierId || !items || !Array.isArray(items)) {
        return sendError(res, 'Supplier ID and items array are required', 400, 'VALIDATION_ERROR');
      }

      const po = await purchasesService.createPurchaseOrder(req.body, req.user.id);
      return sendSuccess(res, po, 'Purchase order created successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  async receive(req, res, next) {
    try {
      const { notes } = req.body;
      const result = await purchasesService.receivePurchaseOrder(req.params.id, notes, req.user.id);
      return sendSuccess(res, result, 'Purchase order received and stock updated successfully');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new PurchasesController();

