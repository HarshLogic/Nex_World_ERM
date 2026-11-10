const posService = require('./pos.service');
const { sendSuccess, sendError } = require('../../utils/response.util');

class PosController {
  async lookup(req, res, next) {
    try {
      const { q } = req.query;
      const results = await posService.lookupProducts(q);
      return sendSuccess(res, results, 'Product lookup successful');
    } catch (err) {
      next(err);
    }
  }

  async saveHold(req, res, next) {
    try {
      const { cartName, customerId, items, note } = req.body;
      const heldCart = await posService.saveHeldCart({ cartName, customerId, items, note }, req.user.id);
      return sendSuccess(res, heldCart, 'Cart held successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  async listHolds(req, res, next) {
    try {
      const carts = await posService.listHeldCarts(req.user.id);
      return sendSuccess(res, carts, 'Held carts retrieved');
    } catch (err) {
      next(err);
    }
  }

  async deleteHold(req, res, next) {
    try {
      await posService.deleteHeldCart(req.params.id, req.user.id);
      return sendSuccess(res, null, 'Held cart deleted');
    } catch (err) {
      next(err);
    }
  }

  async checkout(req, res, next) {
    try {
      const result = await posService.processCheckout(req.body, req.user.id);
      return sendSuccess(res, result, 'Checkout completed successfully', 201);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new PosController();

