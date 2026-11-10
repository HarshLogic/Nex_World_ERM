const categoriesService = require('./categories.service');
const { sendSuccess, sendError } = require('../../utils/response.util');

class CategoriesController {
  async list(req, res, next) {
    try {
      const categories = await categoriesService.listCategories();
      return sendSuccess(res, categories, 'Categories retrieved');
    } catch (err) {
      next(err);
    }
  }

  async create(req, res, next) {
    try {
      const { name } = req.body;
      if (!name) return sendError(res, 'Category name is required', 400, 'VALIDATION_ERROR');
      const category = await categoriesService.createCategory(req.body);
      return sendSuccess(res, category, 'Category created', 201);
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const category = await categoriesService.updateCategory(req.params.id, req.body);
      return sendSuccess(res, category, 'Category updated');
    } catch (err) {
      next(err);
    }
  }

  async delete(req, res, next) {
    try {
      await categoriesService.deleteCategory(req.params.id);
      return sendSuccess(res, null, 'Category deleted successfully');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new CategoriesController();

