const prisma = require('../src/config/prisma');
const backupDatabase = require('./backup-database');
const bootstrapAdmin = require('./bootstrap-admin');

/**
 * Clean Database Script for Client Handover
 * Safely purges demo, test, and development records while preserving legitimate business settings.
 */
async function cleanDatabase() {
  console.log('================================================================');
  console.log('[CLEAN DB] Starting Production Database Cleanup for Client Handover');
  console.log('================================================================');

  // Step 1: Automatic Full Database Snapshot Backup
  console.log('\n[STEP 1/4] Running safety database backup...');
  const backupResult = await backupDatabase();
  console.log(`[SAFETY CHECK] Backup secured at: ${backupResult.backupFilePath}`);

  // Step 2: Delete Demo Records in Referential Integrity Order
  console.log('\n[STEP 2/4] Purging confirmed demo / test records...');

  const deletedCounts = {};

  // 1. Purge Returns
  const deletedReturnItems = await prisma.saleReturnItem.deleteMany({});
  deletedCounts.saleReturnItem = deletedReturnItems.count;

  const deletedReturns = await prisma.saleReturn.deleteMany({});
  deletedCounts.saleReturn = deletedReturns.count;

  // 2. Purge Payments
  const deletedPayments = await prisma.payment.deleteMany({});
  deletedCounts.payment = deletedPayments.count;

  // 3. Purge Sales & Line Items
  const deletedSaleItems = await prisma.saleItem.deleteMany({});
  deletedCounts.saleItem = deletedSaleItems.count;

  const deletedSales = await prisma.sale.deleteMany({});
  deletedCounts.sale = deletedSales.count;

  // 4. Purge Purchase Orders & Receipts
  const deletedPoItems = await prisma.purchaseOrderItem.deleteMany({});
  deletedCounts.purchaseOrderItem = deletedPoItems.count;

  const deletedPoReceipts = await prisma.purchaseReceipt.deleteMany({});
  deletedCounts.purchaseReceipt = deletedPoReceipts.count;

  const deletedPos = await prisma.purchaseOrder.deleteMany({});
  deletedCounts.purchaseOrder = deletedPos.count;

  // 5. Purge Inventory Movements
  const deletedLedger = await prisma.inventoryLedger.deleteMany({});
  deletedCounts.inventoryLedger = deletedLedger.count;

  // 6. Purge Held Carts
  const deletedHeldItems = await prisma.heldCartItem.deleteMany({});
  deletedCounts.heldCartItem = deletedHeldItems.count;

  const deletedHeldCarts = await prisma.heldCart.deleteMany({});
  deletedCounts.heldCart = deletedHeldCarts.count;

  // 7. Purge Demo Products
  const deletedProducts = await prisma.product.deleteMany({});
  deletedCounts.product = deletedProducts.count;

  // Reset counters
  await prisma.productSkuCounter.deleteMany({});
  await prisma.invoiceCounter.deleteMany({});

  // 8. Purge Suppliers & Ledger
  const deletedSupplierLedger = await prisma.supplierLedger.deleteMany({});
  deletedCounts.supplierLedger = deletedSupplierLedger.count;

  const deletedSuppliers = await prisma.supplier.deleteMany({});
  deletedCounts.supplier = deletedSuppliers.count;

  // 9. Purge Customers (Except standard Walk-in template)
  const deletedCustomerLedger = await prisma.customerLedger.deleteMany({});
  deletedCounts.customerLedger = deletedCustomerLedger.count;

  const deletedCustomers = await prisma.customer.deleteMany({
    where: {
      id: { not: 'cust-walkin-default' },
    },
  });
  deletedCounts.customer = deletedCustomers.count;

  // 10. Purge Expenses & Non-Perfume Categories
  const deletedExpenses = await prisma.expense.deleteMany({});
  deletedCounts.expense = deletedExpenses.count;

  const oldCategories = ['Electronics', 'Accessories', 'Office Supplies', 'Packaging'];
  const deletedCategories = await prisma.category.deleteMany({
    where: {
      name: { in: oldCategories },
    },
  });
  deletedCounts.category = deletedCategories.count;

  // 11. Purge Notifications & Activity Logs
  const deletedNotifications = await prisma.notification.deleteMany({});
  deletedCounts.notification = deletedNotifications.count;

  const deletedLogs = await prisma.activityLog.deleteMany({});
  deletedCounts.activityLog = deletedLogs.count;

  // 12. Purge Demo Users (admin@recordsmanager.ae, cashier@recordsmanager.ae)
  const demoUserEmails = ['admin@recordsmanager.ae', 'cashier@recordsmanager.ae'];
  const demoUsers = await prisma.user.findMany({
    where: { email: { in: demoUserEmails } },
  });

  const demoUserIds = demoUsers.map((u) => u.id);
  if (demoUserIds.length > 0) {
    await prisma.session.deleteMany({
      where: { userId: { in: demoUserIds } },
    });
    const deletedUsers = await prisma.user.deleteMany({
      where: { id: { in: demoUserIds } },
    });
    deletedCounts.user = deletedUsers.count;
  } else {
    deletedCounts.user = 0;
  }

  // Step 3: Seed Legitimate Perfume Reference Categories & Settings
  console.log('\n[STEP 3/4] Initializing legitimate perfume reference categories...');
  const perfumeCategories = [
    { name: 'Oud & Agarwood', description: 'Pure Agarwood, Dehn Al Oud & Luxury Blends' },
    { name: 'Attar & Pure Oils', description: 'Concentrated Alcohol-Free Perfume Oils' },
    { name: 'Eau de Parfum (EDP)', description: 'Long-lasting 15-20% Concentration Sprays' },
    { name: 'Eau de Toilette (EDT)', description: 'Daily Light Fresh Fragrances' },
    { name: 'Body Mist & Hair Mist', description: 'Delicate All-over Scent Mists' },
    { name: 'Bakhoor & Incense', description: 'Traditional Arabic Home Fragrance & Incense' },
    { name: 'Luxury Gift Sets', description: 'Curated Perfume Sets & Discovery Collections' },
    { name: 'Perfume Oils', description: 'Roll-on Perfume Oils & Pure Extracts' },
  ];

  for (const cat of perfumeCategories) {
    await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: { name: cat.name, description: cat.description },
    });
  }

  // Ensure default Walk-in customer exists
  await prisma.customer.upsert({
    where: { id: 'cust-walkin-default' },
    update: {},
    create: {
      id: 'cust-walkin-default',
      name: 'Walk-in Customer',
      phone: '050-0000000',
      customerType: 'RETAIL',
    },
  });

  // Ensure BusinessSettings exist with Dubai defaults
  await prisma.businessSettings.upsert({
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
      receiptFooter:
        'Perfumes and oils once opened cannot be exchanged or refunded due to hygiene reasons.',
    },
  });

  // Step 4: Bootstrap Configured Administrator Account
  console.log('\n[STEP 4/4] Ensuring Administrator account is bootstrapped from environment...');
  const admin = await bootstrapAdmin();

  // Print Summary Table
  console.log('\n================================================================');
  console.log('[CLEANUP COMPLETE] Database Handover Verification Summary:');
  console.log('================================================================');
  console.table(deletedCounts);

  const remainingCategories = await prisma.category.count();
  const remainingProducts = await prisma.product.count();
  const remainingSales = await prisma.sale.count();
  const remainingUsers = await prisma.user.count();

  console.log(`\nRemaining State:`);
  console.log(`- Perfume Reference Categories: ${remainingCategories}`);
  console.log(`- Active Products: ${remainingProducts} (Ready for client entry)`);
  console.log(`- Sales Transactions: ${remainingSales} (Clean zero ledger)`);
  console.log(`- Users: ${remainingUsers} (Administrator: ${admin.email})`);

  return { deletedCounts, admin };
}

if (require.main === module) {
  cleanDatabase()
    .then(() => {
      console.log('\n[SUCCESS] Production database cleanup finished successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('\n[CLEANUP ERROR]:', err);
      process.exit(1);
    });
}

module.exports = cleanDatabase;
