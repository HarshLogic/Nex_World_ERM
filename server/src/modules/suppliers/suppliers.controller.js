const suppliersService = require('./suppliers.service');
const { sendSuccess, sendError } = require('../../utils/response.util');

class SuppliersController {
  async list(req, res, next) {
    try {
      const { search, status, page, limit } = req.query;
      const result = await suppliersService.listSuppliers({ search, status, page, limit });
      return sendSuccess(res, result, 'Suppliers retrieved');
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const supplier = await suppliersService.getSupplierById(req.params.id);
      return sendSuccess(res, supplier, 'Supplier details retrieved');
    } catch (err) {
      next(err);
    }
  }

  async create(req, res, next) {
    try {
      const { name } = req.body;
      if (!name) return sendError(res, 'Supplier name is required', 400, 'VALIDATION_ERROR');
      const supplier = await suppliersService.createSupplier(req.body, req.user.id);
      return sendSuccess(res, supplier, 'Supplier created', 201);
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const supplier = await suppliersService.updateSupplier(req.params.id, req.body, req.user.id);
      return sendSuccess(res, supplier, 'Supplier updated');
    } catch (err) {
      next(err);
    }
  }

  async recordPayment(req, res, next) {
    try {
      const { supplierId, amount, notes, paymentMethod } = req.body;
      if (!supplierId || amount === undefined) {
        return sendError(res, 'Supplier ID and payment amount are required', 400, 'VALIDATION_ERROR');
      }

      const result = await suppliersService.recordPayment({ supplierId, amount, notes, paymentMethod }, req.user.id);
      return sendSuccess(res, result, 'Supplier payment recorded successfully', 201);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new SuppliersController();

