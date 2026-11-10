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
          businessName: data.businessName || 'Royal Oud & Perfumes LLC',
          phone: data.phone,
          email: data.email,
          logoUrl: data.logoUrl,
          address: data.address,
          website: data.website,
          taxNumber: data.taxNumber,
          currencyCode: data.currencyCode || 'AED',
          currencySymbol: data.currencySymbol || 'AED',
          defaultTaxRate: data.defaultTaxRate !== undefined ? Number(data.defaultTaxRate) : 5.0,
          pricesIncludeTax: data.pricesIncludeTax !== undefined ? Boolean(data.pricesIncludeTax) : true,
          defaultLowStockThreshold: data.defaultLowStockThreshold !== undefined ? Number(data.defaultLowStockThreshold) : 5,
          invoicePrefix: data.invoicePrefix || 'INV-',
          invoiceFormat: data.invoiceFormat || 'PERF-SEQ',
          receiptHeader: data.receiptHeader,
          receiptFooter: data.receiptFooter,
          receiptNotes: data.receiptNotes,
          showTaxDetails: data.showTaxDetails !== undefined ? Boolean(data.showTaxDetails) : true,
          showCustomerDetails: data.showCustomerDetails !== undefined ? Boolean(data.showCustomerDetails) : true,
          allowNegativeInventory: data.allowNegativeInventory !== undefined ? Boolean(data.allowNegativeInventory) : false,
          defaultPaymentMethod: data.defaultPaymentMethod || 'CASH',
          allowPartialPayments: data.allowPartialPayments !== undefined ? Boolean(data.allowPartialPayments) : true,
          allowCustomerCredit: data.allowCustomerCredit !== undefined ? Boolean(data.allowCustomerCredit) : true,
          maxDiscountPercent: data.maxDiscountPercent !== undefined ? Number(data.maxDiscountPercent) : 50.0,
          businessTimezone: data.businessTimezone || 'Asia/Dubai',
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
          website: data.website !== undefined ? data.website : undefined,
          taxNumber: data.taxNumber !== undefined ? data.taxNumber : undefined,
          currencyCode: data.currencyCode,
          currencySymbol: data.currencySymbol,
          defaultTaxRate: data.defaultTaxRate !== undefined ? Number(data.defaultTaxRate) : undefined,
          pricesIncludeTax: data.pricesIncludeTax !== undefined ? Boolean(data.pricesIncludeTax) : undefined,
          defaultLowStockThreshold: data.defaultLowStockThreshold !== undefined ? Number(data.defaultLowStockThreshold) : undefined,
          invoicePrefix: data.invoicePrefix,
          invoiceFormat: data.invoiceFormat !== undefined ? data.invoiceFormat : undefined,
          receiptHeader: data.receiptHeader,
          receiptFooter: data.receiptFooter,
          receiptNotes: data.receiptNotes !== undefined ? data.receiptNotes : undefined,
          showTaxDetails: data.showTaxDetails !== undefined ? Boolean(data.showTaxDetails) : undefined,
          showCustomerDetails: data.showCustomerDetails !== undefined ? Boolean(data.showCustomerDetails) : undefined,
          allowNegativeInventory: data.allowNegativeInventory !== undefined ? Boolean(data.allowNegativeInventory) : undefined,
          defaultPaymentMethod: data.defaultPaymentMethod !== undefined ? data.defaultPaymentMethod : undefined,
          allowPartialPayments: data.allowPartialPayments !== undefined ? Boolean(data.allowPartialPayments) : undefined,
          allowCustomerCredit: data.allowCustomerCredit !== undefined ? Boolean(data.allowCustomerCredit) : undefined,
          maxDiscountPercent: data.maxDiscountPercent !== undefined ? Number(data.maxDiscountPercent) : undefined,
          businessTimezone: data.businessTimezone !== undefined ? data.businessTimezone : undefined,
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

