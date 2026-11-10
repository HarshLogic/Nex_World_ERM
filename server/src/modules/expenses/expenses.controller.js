const expensesService = require('./expenses.service');
const { sendSuccess, sendError } = require('../../utils/response.util');

class ExpensesController {
  async listCategories(req, res, next) {
    try {
      const categories = await expensesService.listCategories();
      return sendSuccess(res, categories, 'Expense categories retrieved');
    } catch (err) {
      next(err);
    }
  }

  async createCategory(req, res, next) {
    try {
      const { name, description } = req.body;
      if (!name) return sendError(res, 'Category name is required', 400, 'VALIDATION_ERROR');
      const category = await expensesService.createCategory(name, description);
      return sendSuccess(res, category, 'Expense category created', 201);
    } catch (err) {
      next(err);
    }
  }

  async list(req, res, next) {
    try {
      const { categoryId, paidVia, startDate, endDate, page, limit } = req.query;
      const result = await expensesService.listExpenses({ categoryId, paidVia, startDate, endDate, page, limit });
      return sendSuccess(res, result, 'Expenses retrieved');
    } catch (err) {
      next(err);
    }
  }

  async create(req, res, next) {
    try {
      const { expenseCategoryId, payee, amount } = req.body;
      if (!expenseCategoryId || !payee || amount === undefined) {
        return sendError(res, 'Category ID, payee, and amount are required', 400, 'VALIDATION_ERROR');
      }

      const expense = await expensesService.createExpense(req.body, req.user.id);
      return sendSuccess(res, expense, 'Expense recorded successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  async delete(req, res, next) {
    try {
      const result = await expensesService.deleteExpense(req.params.id, req.user.id);
      return sendSuccess(res, result, result.message);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ExpensesController();

