const prisma = require('../../config/prisma');
const { getNextSkuNumber } = require('../../utils/counters.util');
const { round2 } = require('../../utils/calculations.util');
const { logActivity } = require('../../utils/audit.util');

class ProductsService {
  async listProducts({ search, categoryId, brand, status, page = 1, limit = 20 }) {
    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const where = {};
    if (status) where.status = status;
    if (categoryId) where.categoryId = categoryId;
    if (brand) where.brand = { contains: brand, mode: 'insensitive' };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
        { fragranceName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [products, totalCount] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take,
        include: {
          category: { select: { id: true, name: true } },
          inventoryLedgers: {
            select: { signedQuantity: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.product.count({ where }),
    ]);

    // Compute ledger-derived stock on hand for each product
    const items = products.map((prod) => {
      const stockOnHand = prod.inventoryLedgers.reduce(
        (sum, entry) => round2(sum + Number(entry.signedQuantity)),
        0
      );
      const isLowStock = stockOnHand <= prod.reorderLevel;

      // Destructure out the raw ledgers to keep payload clean
      const { inventoryLedgers, ...productData } = prod;
      return {
        ...productData,
        stockOnHand,
        isLowStock,
      };
    });

    return {
      items,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        totalCount,
        totalPages: Math.ceil(totalCount / take),
      },
    };
  }

  async getProductById(id) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        inventoryLedgers: {
          take: 50,
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!product) {
      const err = new Error('Product not found');
      err.statusCode = 404;
      err.isOperational = true;
      throw err;
    }

    const stockOnHand = product.inventoryLedgers.reduce(
      (sum, entry) => round2(sum + Number(entry.signedQuantity)),
      0
    );

    return {
      ...product,
      stockOnHand,
      isLowStock: stockOnHand <= product.reorderLevel,
    };
  }

  async createProduct(data, userId) {
    return await prisma.$transaction(async (tx) => {
      // Concurrency-safe atomic SKU generation
      const sku = data.sku || (await getNextSkuNumber(tx));

      const product = await tx.product.create({
        data: {
          name: data.name,
          sku,
          barcode: data.barcode || null,
          qrCode: data.qrCode || sku,
          categoryId: data.categoryId,
          brand: data.brand || null,
          perfumeType: data.perfumeType || null,
          fragranceName: data.fragranceName || null,
          sizeVolume: data.sizeVolume || null,
          concentration: data.concentration || null,
          gender: data.gender || null,
          imageUrl: data.imageUrl || null,
          supplierId: data.supplierId || null,
          description: data.description || null,
          sellingPrice: Number(data.sellingPrice || 0),
          baseCost: Number(data.baseCost || 0),
          taxRate: Number(data.taxRate || 0),
          reorderLevel: Number(data.reorderLevel || 5),
          suggestedReorderQty: Number(data.suggestedReorderQty || 20),
          status: data.status || 'ACTIVE',
        },
      });

      // If initial stock was provided, create initial inventory ledger entry
      if (data.initialStock && Number(data.initialStock) > 0) {
        const qty = Number(data.initialStock);
        await tx.inventoryLedger.create({
          data: {
            productId: product.id,
            transactionType: 'STOCK_IN',
            quantity: qty,
            signedQuantity: qty,
            unitCost: product.baseCost,
            reason: 'Initial stock on creation',
            performedBy: userId,
          },
        });
      }

      await logActivity({
        prisma: tx,
        userId,
        action: 'CREATE',
        module: 'PRODUCTS',
        description: `Created product ${product.name} (${product.sku})`,
        entityId: product.id,
      });

      return product;
    });
  }

  async updateProduct(id, data, userId) {
    const updated = await prisma.product.update({
      where: { id },
      data: {
        name: data.name,
        barcode: data.barcode !== undefined ? data.barcode : undefined,
        qrCode: data.qrCode !== undefined ? data.qrCode : undefined,
        categoryId: data.categoryId,
        brand: data.brand !== undefined ? data.brand : undefined,
        perfumeType: data.perfumeType !== undefined ? data.perfumeType : undefined,
        fragranceName: data.fragranceName !== undefined ? data.fragranceName : undefined,
        sizeVolume: data.sizeVolume !== undefined ? data.sizeVolume : undefined,
        concentration: data.concentration !== undefined ? data.concentration : undefined,
        gender: data.gender !== undefined ? data.gender : undefined,
        imageUrl: data.imageUrl !== undefined ? data.imageUrl : undefined,
        supplierId: data.supplierId !== undefined ? data.supplierId : undefined,
        description: data.description,
        sellingPrice: data.sellingPrice !== undefined ? Number(data.sellingPrice) : undefined,
        baseCost: data.baseCost !== undefined ? Number(data.baseCost) : undefined,
        taxRate: data.taxRate !== undefined ? Number(data.taxRate) : undefined,
        reorderLevel: data.reorderLevel !== undefined ? Number(data.reorderLevel) : undefined,
        suggestedReorderQty: data.suggestedReorderQty !== undefined ? Number(data.suggestedReorderQty) : undefined,
        status: data.status,
      },
    });

    await logActivity({
      prisma,
      userId,
      action: 'UPDATE',
      module: 'PRODUCTS',
      description: `Updated product ${updated.name} (${updated.sku})`,
      entityId: updated.id,
    });

    return updated;
  }

  async deleteProduct(id, userId) {
    // Check if product has sales or stock ledger history
    const [salesCount, ledgerCount] = await Promise.all([
      prisma.saleItem.count({ where: { productId: id } }),
      prisma.inventoryLedger.count({ where: { productId: id } }),
    ]);

    if (salesCount > 0 || ledgerCount > 0) {
      // Soft-deactivate to protect financial integrity
      const deactivated = await prisma.product.update({
        where: { id },
        data: { status: 'INACTIVE' },
      });

      await logActivity({
        prisma,
        userId,
        action: 'DEACTIVATE',
        module: 'PRODUCTS',
        description: `Deactivated product ${deactivated.name} (has ${salesCount} sales and ${ledgerCount} ledger records)`,
        entityId: id,
      });

      return { deleted: false, deactivated: true, message: 'Product has transactional history and was deactivated instead of permanently deleted.' };
    }

    const deleted = await prisma.product.delete({
      where: { id },
    });

    await logActivity({
      prisma,
      userId,
      action: 'DELETE',
      module: 'PRODUCTS',
      description: `Permanently deleted product ${deleted.name} (${deleted.sku})`,
      entityId: id,
    });

    return { deleted: true, deactivated: false, message: 'Product permanently deleted.' };
  }
}

module.exports = new ProductsService();

