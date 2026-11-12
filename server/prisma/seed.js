const bcrypt = require('bcrypt');
const prisma = require('../src/config/prisma');

async function seed() {
  console.log('[SEED] Starting database seed...');

  try {
    // 1. Business Settings (AED currency, 5% VAT)
    const settings = await prisma.businessSettings.upsert({
      where: { id: 'default-settings' },
      update: {},
      create: {
        id: 'default-settings',
        businessName: 'Royal Oud & Perfumes LLC',
        phone: '+971 4 399 8888',
        email: 'sales@royaloudperfumes.ae',
        address: 'Shop 12, Gold & Diamond Souk, Deira, Dubai, UAE',
        website: 'https://royaloudperfumes.ae',
        taxNumber: '100234567800003',
        currencyCode: 'AED',
        currencySymbol: 'AED',
        defaultTaxRate: 5.0,
        pricesIncludeTax: true,
        defaultLowStockThreshold: 5,
        invoicePrefix: 'INV-',
        invoiceFormat: 'PERF-SEQ',
        receiptHeader: 'Royal Oud & Perfumes — Luxury Fragrances Dubai',
        receiptFooter: 'Perfumes and oils once opened cannot be exchanged or refunded due to hygiene reasons.',
      },
    });
    console.log('[SEED] Settings initialized:', settings.businessName);

    // 2. Demo Users (Admin and Regular Cashier)
    const salt = await bcrypt.genSalt(12);
    const adminPasswordHash = await bcrypt.hash('Admin@123456', salt);
    const userPasswordHash = await bcrypt.hash('Cashier@123456', salt);

    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@recordsmanager.ae' },
      update: {},
      create: {
        email: 'admin@recordsmanager.ae',
        name: 'Super Admin',
        passwordHash: adminPasswordHash,
        role: 'ADMIN',
        status: 'ACTIVE',
      },
    });

    const cashierUser = await prisma.user.upsert({
      where: { email: 'cashier@recordsmanager.ae' },
      update: {},
      create: {
        email: 'cashier@recordsmanager.ae',
        name: 'Jane Cashier',
        passwordHash: userPasswordHash,
        role: 'USER',
        status: 'ACTIVE',
      },
    });
    console.log('[SEED] Users created: Admin (admin@recordsmanager.ae), Cashier (cashier@recordsmanager.ae)');

    // 3. Default Categories
    const categories = ['Electronics', 'Accessories', 'Office Supplies', 'Packaging'];
    const categoryMap = new Map();

    for (const name of categories) {
      const cat = await prisma.category.upsert({
        where: { name },
        update: {},
        create: { name, description: `${name} department` },
      });
      categoryMap.set(name, cat.id);
    }
    console.log('[SEED] Categories initialized');

    // 4. Default Products with SKUs, Barcodes & Initial Stock in Ledger
    const sampleProducts = [
      {
        name: 'Wireless Barcode Scanner 2D',
        sku: 'SKU-00001',
        barcode: '629104000011',
        categoryName: 'Electronics',
        sellingPrice: 189.0,
        baseCost: 110.0,
        taxRate: 5.0,
        reorderLevel: 5,
        initialStock: 25,
      },
      {
        name: 'Thermal Receipt Paper Rolls (Pack of 10)',
        sku: 'SKU-00002',
        barcode: '629104000028',
        categoryName: 'Office Supplies',
        sellingPrice: 45.0,
        baseCost: 22.0,
        taxRate: 5.0,
        reorderLevel: 10,
        initialStock: 100,
      },
      {
        name: 'USB-C Heavy Duty Braided Cable 2M',
        sku: 'SKU-00003',
        barcode: '629104000035',
        categoryName: 'Accessories',
        sellingPrice: 35.0,
        baseCost: 14.0,
        taxRate: 5.0,
        reorderLevel: 15,
        initialStock: 50,
      },
      {
        name: 'Electronic Cash Drawer 5-Bill 8-Coin',
        sku: 'SKU-00004',
        barcode: '629104000042',
        categoryName: 'Electronics',
        sellingPrice: 220.0,
        baseCost: 140.0,
        taxRate: 5.0,
        reorderLevel: 3,
        initialStock: 8,
      },
    ];

    for (const item of sampleProducts) {
      const categoryId = categoryMap.get(item.categoryName);
      const prod = await prisma.product.upsert({
        where: { sku: item.sku },
        update: {},
        create: {
          name: item.name,
          sku: item.sku,
          barcode: item.barcode,
          qrCode: item.sku,
          categoryId,
          sellingPrice: item.sellingPrice,
          baseCost: item.baseCost,
          taxRate: item.taxRate,
          reorderLevel: item.reorderLevel,
          status: 'ACTIVE',
        },
      });

      // Check if stock ledger already exists
      const existingLedger = await prisma.inventoryLedger.findFirst({
        where: { productId: prod.id },
      });

      if (!existingLedger && item.initialStock > 0) {
        await prisma.inventoryLedger.create({
          data: {
            productId: prod.id,
            transactionType: 'STOCK_IN',
            quantity: item.initialStock,
            signedQuantity: item.initialStock,
            unitCost: item.baseCost,
            reason: 'Opening stock balance',
            performedBy: adminUser.id,
          },
        });
      }
    }
    console.log('[SEED] Products and inventory ledger opening balances seeded');

    // 5. Default Customers
    await prisma.customer.upsert({
      where: { id: 'cust-walkin-default' },
      update: {},
      create: {
        id: 'cust-walkin-default',
        name: 'Walk-in Customer',
        phone: '050-0000000',
        customerType: 'RETAIL',
        createdById: adminUser.id,
      },
    });

    await prisma.customer.upsert({
      where: { id: 'cust-corp-01' },
      update: {},
      create: {
        id: 'cust-corp-01',
        name: 'Al Etihad Logistics LLC',
        phone: '+971 4 222 3344',
        email: 'procurement@aletihad.ae',
        customerType: 'WHOLESALE',
        balance: 0.0,
        createdById: adminUser.id,
      },
    });
    console.log('[SEED] Customers initialized');

    // 6. Default Suppliers
    await prisma.supplier.upsert({
      where: { id: 'supp-tech-distrib' },
      update: {},
      create: {
        id: 'supp-tech-distrib',
        name: 'Gulf Technology Distribution FZCO',
        contactPerson: 'Rashid Al Nuaimi',
        phone: '+971 4 888 1234',
        email: 'orders@gulftech.ae',
        paymentTerms: 'NET30',
        payableBalance: 0.0,
      },
    });
    console.log('[SEED] Suppliers initialized');

    console.log('[SEED] Seeding successfully completed!');
  } catch (err) {
    console.error('[SEED ERROR]:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  seed();
}

module.exports = seed;

