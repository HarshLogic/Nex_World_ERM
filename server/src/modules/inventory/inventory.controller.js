const inventoryService = require('./inventory.service');
const { sendSuccess, sendError } = require('../../utils/response.util');

class InventoryController {
  async getLedger(req, res, next) {
    try {
      const { productId, transactionType, startDate, endDate, page, limit } = req.query;
      const result = await inventoryService.getLedger({ productId, transactionType, startDate, endDate, page, limit });
      return sendSuccess(res, result, 'Inventory ledger retrieved');
    } catch (err) {
      next(err);
    }
  }

  async getOnHand(req, res, next) {
    try {
      const stock = await inventoryService.getProductOnHandQuantity(req.params.productId);
      return sendSuccess(res, { productId: req.params.productId, stockOnHand: stock }, 'On-hand stock retrieved');
    } catch (err) {
      next(err);
    }
  }

  async stockIn(req, res, next) {
    try {
      const { productId, quantity, unitCost, reason, referenceId } = req.body;
      if (!productId || quantity === undefined) {
        return sendError(res, 'Product ID and quantity are required', 400, 'VALIDATION_ERROR');
      }

      const result = await inventoryService.recordStockIn({ productId, quantity, unitCost, reason, referenceId }, req.user.id);
      return sendSuccess(res, result, 'Stock In recorded successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  async stockOut(req, res, next) {
    try {
      const { productId, quantity, reason, referenceId } = req.body;
      if (!productId || quantity === undefined) {
        return sendError(res, 'Product ID and quantity are required', 400, 'VALIDATION_ERROR');
      }

      const result = await inventoryService.recordStockOut({ productId, quantity, reason, referenceId }, req.user.id);
      return sendSuccess(res, result, 'Stock Out recorded successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  async bulkReceive(req, res, next) {
    try {
      const { items, reason, referenceId } = req.body;
      if (!items || !Array.isArray(items)) {
        return sendError(res, 'Items array is required for bulk receive', 400, 'VALIDATION_ERROR');
      }

      const result = await inventoryService.bulkReceive({ items, reason, referenceId }, req.user.id);
      return sendSuccess(res, result, 'Bulk receive processed successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  async stocktake(req, res, next) {
    try {
      const { productId, physicalCount, notes } = req.body;
      if (!productId || physicalCount === undefined) {
        return sendError(res, 'Product ID and physicalCount are required', 400, 'VALIDATION_ERROR');
      }

      const result = await inventoryService.performStocktake({ productId, physicalCount, notes }, req.user.id);
      return sendSuccess(res, result, 'Stocktake processed successfully');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new InventoryController();

