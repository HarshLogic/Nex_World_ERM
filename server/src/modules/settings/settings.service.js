const prisma = require('../../config/prisma');
const { logActivity } = require('../../utils/audit.util');

class SettingsService {
  async getSettings() {
    let settings = await prisma.businessSettings.findFirst();
    if (!settings) {
      settings = await prisma.businessSettings.create({
        data: {
          businessName: 'Records Manager Retail',
          phone: '+971 4 000 0000',
          email: 'info@recordsmanager.ae',
          address: 'Dubai, United Arab Emirates',
          currencyCode: 'AED',
          currencySymbol: 'AED',
          defaultTaxRate: 5.0,
          pricesIncludeTax: true,
          defaultLowStockThreshold: 5,
          invoicePrefix: 'INV-',
          receiptHeader: 'Thank you for shopping with us!',
          receiptFooter: 'Goods once sold can be returned within 14 days with original receipt.',
        },
      });
    }
    return settings;
  }

  async updateSettings(data, adminUserId) {
    let settings = await prisma.businessSettings.findFirst();

    if (!settings) {
      settings = await prisma.businessSettings.create({
        data: {
          businessName: data.businessName || 'Records Manager Retail',
          phone: data.phone,
          email: data.email,
          logoUrl: data.logoUrl,
          address: data.address,
          currencyCode: data.currencyCode || 'AED',
          currencySymbol: data.currencySymbol || 'AED',
          defaultTaxRate: data.defaultTaxRate !== undefined ? Number(data.defaultTaxRate) : 5.0,
          pricesIncludeTax: data.pricesIncludeTax !== undefined ? Boolean(data.pricesIncludeTax) : true,
          defaultLowStockThreshold: data.defaultLowStockThreshold !== undefined ? Number(data.defaultLowStockThreshold) : 5,
          invoicePrefix: data.invoicePrefix || 'INV-',
          receiptHeader: data.receiptHeader,
          receiptFooter: data.receiptFooter,
        },
      });
    } else {
      settings = await prisma.businessSettings.update({
        where: { id: settings.id },
        data: {
          businessName: data.businessName,
          phone: data.phone,
          email: data.email,
          logoUrl: data.logoUrl,
          address: data.address,
          currencyCode: data.currencyCode,
          currencySymbol: data.currencySymbol,
          defaultTaxRate: data.defaultTaxRate !== undefined ? Number(data.defaultTaxRate) : undefined,
          pricesIncludeTax: data.pricesIncludeTax !== undefined ? Boolean(data.pricesIncludeTax) : undefined,
          defaultLowStockThreshold: data.defaultLowStockThreshold !== undefined ? Number(data.defaultLowStockThreshold) : undefined,
          invoicePrefix: data.invoicePrefix,
          receiptHeader: data.receiptHeader,
          receiptFooter: data.receiptFooter,
        },
      });
    }

    await logActivity({
      prisma,
      userId: adminUserId,
      action: 'UPDATE_SETTINGS',
      module: 'SETTINGS',
      description: 'Updated system and business settings',
      entityId: settings.id,
    });

    return settings;
  }
}

module.exports = new SettingsService();

