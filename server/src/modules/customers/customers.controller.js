const customersService = require('./customers.service');
const { sendSuccess, sendError } = require('../../utils/response.util');

class CustomersController {
  async list(req, res, next) {
    try {
      const { search, customerType, status, page, limit } = req.query;
      const result = await customersService.listCustomers({ search, customerType, status, page, limit });
      return sendSuccess(res, result, 'Customers retrieved');
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const customer = await customersService.getCustomerById(req.params.id);
      return sendSuccess(res, customer, 'Customer details retrieved');
    } catch (err) {
      next(err);
    }
  }

  async create(req, res, next) {
    try {
      const { name } = req.body;
      if (!name) return sendError(res, 'Customer name is required', 400, 'VALIDATION_ERROR');
      const customer = await customersService.createCustomer(req.body, req.user.id);
      return sendSuccess(res, customer, 'Customer created', 201);
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const customer = await customersService.updateCustomer(req.params.id, req.body, req.user.id);
      return sendSuccess(res, customer, 'Customer updated');
    } catch (err) {
      next(err);
    }
  }

  async delete(req, res, next) {
    try {
      const result = await customersService.deleteCustomer(req.params.id, req.user.id);
      return sendSuccess(res, result, result.message);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new CustomersController();

