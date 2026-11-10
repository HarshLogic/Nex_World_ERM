const productsService = require('./products.service');
const { sendSuccess, sendError } = require('../../utils/response.util');

class ProductsController {
  async list(req, res, next) {
    try {
      const { search, categoryId, status, page, limit } = req.query;
      const result = await productsService.listProducts({ search, categoryId, status, page, limit });
      return sendSuccess(res, result, 'Products retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const product = await productsService.getProductById(req.params.id);
      return sendSuccess(res, product, 'Product retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  async create(req, res, next) {
    try {
      const { name, categoryId, sellingPrice, baseCost } = req.body;
      if (!name || !categoryId || sellingPrice === undefined) {
        return sendError(res, 'Name, Category ID, and Selling Price are required', 400, 'VALIDATION_ERROR');
      }

      const product = await productsService.createProduct(req.body, req.user.id);
      return sendSuccess(res, product, 'Product created successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const product = await productsService.updateProduct(req.params.id, req.body, req.user.id);
      return sendSuccess(res, product, 'Product updated successfully');
    } catch (err) {
      next(err);
    }
  }

  async delete(req, res, next) {
    try {
      const result = await productsService.deleteProduct(req.params.id, req.user.id);
      return sendSuccess(res, result, result.message);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ProductsController();

