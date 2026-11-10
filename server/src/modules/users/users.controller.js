const usersService = require('./users.service');
const { sendSuccess, sendError } = require('../../utils/response.util');

class UsersController {
  async list(req, res, next) {
    try {
      const { page, limit } = req.query;
      const result = await usersService.listUsers({ page, limit });
      return sendSuccess(res, result, 'Users retrieved');
    } catch (err) {
      next(err);
    }
  }

  async create(req, res, next) {
    try {
      const { name, email, password } = req.body;
      if (!name || !email || !password) {
        return sendError(res, 'Name, email, and password are required', 400, 'VALIDATION_ERROR');
      }

      const user = await usersService.createUser(req.body, req.user.id);
      return sendSuccess(res, user, 'User created successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const user = await usersService.updateUser(req.params.id, req.body, req.user.id);
      return sendSuccess(res, user, 'User updated successfully');
    } catch (err) {
      next(err);
    }
  }

  async resetPassword(req, res, next) {
    try {
      const { password } = req.body;
      if (!password) {
        return sendError(res, 'New password is required', 400, 'VALIDATION_ERROR');
      }

      const result = await usersService.resetPassword(req.params.id, password, req.user.id);
      return sendSuccess(res, result, result.message);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new UsersController();

