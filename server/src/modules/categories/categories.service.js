const prisma = require('../../config/prisma');

class CategoriesService {
  async listCategories() {
    return await prisma.category.findMany({
      include: {
        _count: { select: { products: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async createCategory(data) {
    return await prisma.category.create({
      data: {
        name: data.name.trim(),
        description: data.description || null,
      },
    });
  }

  async updateCategory(id, data) {
    return await prisma.category.update({
      where: { id },
      data: {
        name: data.name ? data.name.trim() : undefined,
        description: data.description,
      },
    });
  }

  async deleteCategory(id) {
    const productsCount = await prisma.product.count({
      where: { categoryId: id },
    });

    if (productsCount > 0) {
      const err = new Error(`Cannot delete category with ${productsCount} associated products. Reassign or delete products first.`);
      err.statusCode = 400;
      err.isOperational = true;
      throw err;
    }

    return await prisma.category.delete({
      where: { id },
    });
  }
}

module.exports = new CategoriesService();

