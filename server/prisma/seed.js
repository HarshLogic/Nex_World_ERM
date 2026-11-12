const prisma = require('../src/config/prisma');
const bootstrapAdmin = require('../scripts/bootstrap-admin');

/**
 * Production Database Seed Script
 * Configures essential business defaults, reference perfume categories,
 * and bootstraps the initial Administrator account from environment variables.
 * Contains ZERO dummy products, test sales, or hardcoded passwords.
 */
async function seed() {
  console.log('[SEED] Starting production database seed...');

  try {
    // 1. Business Settings (AED currency, 5% UAE VAT, Luxury Perfume Store Defaults)
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
        receiptFooter:
          'Perfumes and oils once opened cannot be exchanged or refunded due to hygiene reasons.',
      },
    });
    console.log('[SEED] Business settings initialized:', settings.businessName);

    // 2. Default Perfume Reference Categories
    const categories = [
      { name: 'Oud & Agarwood', description: 'Pure Agarwood, Dehn Al Oud & Luxury Blends' },
      { name: 'Attar & Pure Oils', description: 'Concentrated Alcohol-Free Perfume Oils' },
      { name: 'Eau de Parfum (EDP)', description: 'Long-lasting 15-20% Concentration Sprays' },
      { name: 'Eau de Toilette (EDT)', description: 'Daily Light Fresh Fragrances' },
      { name: 'Body Mist & Hair Mist', description: 'Delicate All-over Scent Mists' },
      { name: 'Bakhoor & Incense', description: 'Traditional Arabic Home Fragrance & Incense' },
      { name: 'Luxury Gift Sets', description: 'Curated Perfume Sets & Discovery Collections' },
      { name: 'Perfume Oils', description: 'Roll-on Perfume Oils & Pure Extracts' },
    ];

    for (const cat of categories) {
      await prisma.category.upsert({
        where: { name: cat.name },
        update: {},
        create: { name: cat.name, description: cat.description },
      });
    }
    console.log('[SEED] Reference perfume categories initialized (8 categories).');

    // 3. Default Walk-in Customer
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
    console.log('[SEED] Default Walk-in Customer initialized.');

    // 4. Secure Initial Administrator Account from Environment Variables
    const admin = await bootstrapAdmin();
    console.log('[SEED] Administrator verified:', admin.email);

    console.log('[SEED] Database seeding successfully completed.');
  } catch (err) {
    console.error('[SEED ERROR]:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  seed();
}

module.exports = seed;
