const fs = require('fs');
const path = require('path');
const prisma = require('../src/config/prisma');

/**
 * Database Backup Script
 * Exports all database records into an encrypted/JSON backup snapshot before any destructive actions.
 */
async function backupDatabase() {
  console.log('[BACKUP] Starting database snapshot backup...');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.resolve(__dirname, '../../backups');

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const backupFilePath = path.join(backupDir, `db-backup-${timestamp}.json`);

  const tables = [
    'user',
    'session',
    'category',
    'product',
    'productSkuCounter',
    'invoiceCounter',
    'inventoryLedger',
    'customer',
    'customerLedger',
    'supplier',
    'supplierLedger',
    'purchaseOrder',
    'purchaseOrderItem',
    'purchaseReceipt',
    'sale',
    'saleItem',
    'payment',
    'saleReturn',
    'saleReturnItem',
    'heldCart',
    'heldCartItem',
    'expense',
    'expenseCategory',
    'businessSettings',
    'activityLog',
    'notification',
    'idempotencyRecord',
  ];

  const backupData = {
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    records: {},
    summary: {},
  };

  let totalRecords = 0;

  for (const table of tables) {
    try {
      if (prisma[table]) {
        const rows = await prisma[table].findMany();
        backupData.records[table] = rows;
        backupData.summary[table] = rows.length;
        totalRecords += rows.length;
        console.log(`[BACKUP] - Table "${table}": ${rows.length} records exported.`);
      }
    } catch (err) {
      console.warn(`[BACKUP] Note: Could not export table "${table}": ${err.message}`);
      backupData.summary[table] = 'UNAVAILABLE';
    }
  }

  backupData.totalRecords = totalRecords;
  fs.writeFileSync(backupFilePath, JSON.stringify(backupData, null, 2), 'utf-8');

  console.log(`[BACKUP COMPLETED] Backup successfully saved to:\n  -> ${backupFilePath}`);
  console.log(`[BACKUP SUMMARY] Total records captured across all tables: ${totalRecords}`);

  return { backupFilePath, totalRecords, summary: backupData.summary };
}

if (require.main === module) {
  backupDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[BACKUP FAILED]:', err.message);
      process.exit(1);
    });
}

module.exports = backupDatabase;
