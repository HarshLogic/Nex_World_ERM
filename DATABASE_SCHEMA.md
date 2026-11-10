# Database Schema Specification: Records Manager ERP + POS + Inventory

This document details the normalized relational database architecture implemented using PostgreSQL and Prisma ORM.

---

## 1. Relational Entities Summary

| Entity | Description | Primary Key | Key Relationships / Constraints |
|---|---|---|---|
| `User` | System operators (Cashiers, Managers, Admins) | UUID | Unique `email`, Enum `Role` (ADMIN, USER) |
| `Session` | Active authentication sessions | UUID | FK `userId` $\to$ `User.id` |
| `Category` | Hierarchical catalog classifications | UUID | Unique `name` |
| `Product` | Catalog items | UUID | Unique `sku`, Indexed `barcode`, FK `categoryId` |
| `ProductSkuCounter` | Atomic counter for SKU sequencing | UUID | Unique `prefix` (`SKU-`), Atomic `lastNumber` |
| `InventoryLedger` | Immutable stock movement journal | UUID | FK `productId`, FK `performedBy`, Signed quantities |
| `Customer` | Retail & wholesale client CRM | UUID | Tracked ledger balance |
| `CustomerLedger` | Customer balance transactions | UUID | FK `customerId`, Signed amount movements |
| `Supplier` | Procurement vendors | UUID | Payment terms (COD, Net 15, Net 30, Net 60) |
| `SupplierLedger` | Accounts payable transaction journal | UUID | FK `supplierId`, Running balance |
| `PurchaseOrder` | Procurement orders | UUID | Unique `poNumber`, FK `supplierId`, Status enum |
| `PurchaseOrderItem` | PO line items with landed cost allocation | UUID | FK `purchaseOrderId`, FK `productId` |
| `PurchaseReceipt` | Stock receipt verification events | UUID | FK `purchaseOrderId`, FK `receivedById` |
| `Sale` | POS transaction record | UUID | Unique `invoiceNumber`, FK `customerId`, FK `cashierId` |
| `SaleItem` | Sale line items with historical cost snapshots | UUID | FK `saleId`, FK `productId` |
| `InvoiceCounter` | Atomic counter for invoice numbering | UUID | Unique `prefix` (`INV-`), Atomic `lastNumber` |
| `Payment` | Settlement records (Cash, Card, Credit) | UUID | FK `saleId`, tender & change calculation |
| `SaleReturn` | Return/refund parent record | UUID | Unique `returnNumber`, FK `originalSaleId` |
| `SaleReturnItem` | Return line items with original item references | UUID | FK `saleReturnId`, FK `originalSaleItemId` |
| `HeldCart` | Persisted paused POS carts | UUID | FK `cashierId`, FK `customerId` |
| `HeldCartItem` | Paused cart line items | UUID | FK `heldCartId`, FK `productId` |
| `ExpenseCategory` | Operational expense categories | UUID | Unique `name` |
| `Expense` | Operational cash expenditures | UUID | FK `expenseCategoryId`, FK `createdById` |
| `BusinessSettings` | Enterprise configuration & currency | UUID | Default AED currency, tax toggles |
| `ActivityLog` | Append-only audit trail | UUID | FK `userId`, JSON metadata |
| `Notification` | System and operational event alerts | UUID | Unread flag, Type enum |
| `IdempotencyRecord` | Distributed checkout retry deduplication | UUID | Unique `key`, request hash, response payload |

---

## 2. Complete Prisma Schema Definition

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  ADMIN
  USER
}

enum UserStatus {
  ACTIVE
  INACTIVE
}

enum ProductStatus {
  ACTIVE
  INACTIVE
}

enum InventoryTransactionType {
  STOCK_IN
  STOCK_OUT
  SALE
  RETURN
  ADJUSTMENT
  PURCHASE_RECEIPT
}

enum CustomerType {
  RETAIL
  WHOLESALE
}

enum PaymentTerms {
  COD
  NET15
  NET30
  NET60
}

enum PurchaseOrderStatus {
  DRAFT
  PENDING
  RECEIVED
  CANCELLED
}

enum PaymentMethod {
  CASH
  CARD
  CREDIT
  OTHER
}

enum PaymentStatus {
  PAID
  PARTIAL
  UNPAID
}

enum DiscountType {
  PERCENTAGE
  FIXED
}

enum NotificationType {
  LOW_STOCK
  PURCHASE_ORDER
  CHECKOUT
  ADJUSTMENT
  SYSTEM
}

model User {
  id           String       @id @default(uuid())
  email        String       @unique
  name         String
  passwordHash String
  role         Role         @default(USER)
  status       UserStatus   @default(ACTIVE)
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt

  sessions         Session[]
  sales            Sale[]
  heldCarts        HeldCart[]
  inventoryLedgers InventoryLedger[]
  expenses         Expense[]
  activityLogs     ActivityLog[]
  purchaseOrders   PurchaseOrder[]
  purchaseReceipts PurchaseReceipt[]
  returnsProcessed SaleReturn[]
}

model Session {
  id        String   @id @default(uuid())
  userId    String
  token     String   @unique
  ipAddress String?
  userAgent String?
  expiresAt DateTime
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([token])
  @@index([userId])
}

model Category {
  id          String    @id @default(uuid())
  name        String    @unique
  description String?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  products Product[]
}

model Product {
  id                 String        @id @default(uuid())
  name               String
  sku                String        @unique
  barcode            String?       @unique
  qrCode             String?
  categoryId         String
  description        String?
  sellingPrice       Decimal       @db.Decimal(12, 2)
  baseCost           Decimal       @db.Decimal(12, 2)
  taxRate            Decimal       @default(0.00) @db.Decimal(5, 2)
  reorderLevel       Int           @default(5)
  suggestedReorderQty Int          @default(20)
  status             ProductStatus @default(ACTIVE)
  createdAt          DateTime      @default(now())
  updatedAt          DateTime      @updatedAt

  category          Category            @relation(fields: [categoryId], references: [id])
  inventoryLedgers  InventoryLedger[]
  saleItems         SaleItem[]
  purchaseOrderItems PurchaseOrderItem[]
  heldCartItems     HeldCartItem[]
  saleReturnItems   SaleReturnItem[]

  @@index([sku])
  @@index([barcode])
  @@index([categoryId])
}

model ProductSkuCounter {
  id         String   @id @default(uuid())
  prefix     String   @unique @default("SKU-")
  lastNumber BigInt   @default(0)
  updatedAt  DateTime @updatedAt
}

model InvoiceCounter {
  id         String   @id @default(uuid())
  prefix     String   @unique @default("INV-")
  lastNumber BigInt   @default(0)
  updatedAt  DateTime @updatedAt
}

model InventoryLedger {
  id              String                   @id @default(uuid())
  productId       String
  transactionType InventoryTransactionType
  quantity        Decimal                  @db.Decimal(12, 2)
  signedQuantity  Decimal                  @db.Decimal(12, 2)
  unitCost        Decimal                  @default(0.00) @db.Decimal(12, 2)
  reason          String?
  referenceId     String?
  performedBy     String
  location        String                   @default("MAIN")
  createdAt       DateTime                 @default(now())

  product Product @relation(fields: [productId], references: [id])
  user    User    @relation(fields: [performedBy], references: [id])

  @@index([productId])
  @@index([transactionType])
  @@index([referenceId])
  @@index([createdAt])
}

model Customer {
  id           String       @id @default(uuid())
  name         String
  phone        String?
  email        String?
  address      String?
  customerType CustomerType @default(RETAIL)
  customerGroup String?
  balance      Decimal      @default(0.00) @db.Decimal(12, 2)
  status       UserStatus   @default(ACTIVE)
  createdById  String?
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt

  sales           Sale[]
  heldCarts       HeldCart[]
  customerLedgers CustomerLedger[]

  @@index([phone])
  @@index([email])
}

model CustomerLedger {
  id             String   @id @default(uuid())
  customerId     String
  transactionType String  // SALE_CREDIT, PAYMENT, ADJUSTMENT, REFUND
  amount         Decimal  @db.Decimal(12, 2)
  signedAmount   Decimal  @db.Decimal(12, 2)
  runningBalance Decimal  @db.Decimal(12, 2)
  referenceId    String?
  notes          String?
  performedBy    String?
  createdAt      DateTime @default(now())

  customer Customer @relation(fields: [customerId], references: [id])

  @@index([customerId])
}

model Supplier {
  id             String       @id @default(uuid())
  name           String
  contactPerson  String?
  phone          String?
  email          String?
  address        String?
  paymentTerms   PaymentTerms @default(COD)
  payableBalance Decimal      @default(0.00) @db.Decimal(12, 2)
  status         UserStatus   @default(ACTIVE)
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  purchaseOrders  PurchaseOrder[]
  supplierLedgers SupplierLedger[]
}

model SupplierLedger {
  id             String   @id @default(uuid())
  supplierId     String
  transactionType String  // PURCHASE_BILL, PAYMENT, ADJUSTMENT
  amount         Decimal  @db.Decimal(12, 2)
  signedAmount   Decimal  @db.Decimal(12, 2)
  runningBalance Decimal  @db.Decimal(12, 2)
  referenceId    String?
  notes          String?
  performedBy    String?
  createdAt      DateTime @default(now())

  supplier Supplier @relation(fields: [supplierId], references: [id])

  @@index([supplierId])
}

model PurchaseOrder {
  id                   String              @id @default(uuid())
  poNumber             String              @unique
  supplierId           String
  expectedDeliveryDate DateTime?
  subtotal             Decimal             @default(0.00) @db.Decimal(12, 2)
  landedCosts          Decimal             @default(0.00) @db.Decimal(12, 2)
  grandTotal           Decimal             @default(0.00) @db.Decimal(12, 2)
  status               PurchaseOrderStatus @default(DRAFT)
  notes                String?
  createdById          String
  createdAt            DateTime            @default(now())
  updatedAt            DateTime            @updatedAt

  supplier         Supplier            @relation(fields: [supplierId], references: [id])
  createdBy        User                @relation(fields: [createdById], references: [id])
  items            PurchaseOrderItem[]
  purchaseReceipts PurchaseReceipt[]

  @@index([poNumber])
  @@index([supplierId])
  @@index([status])
}

model PurchaseOrderItem {
  id                  String   @id @default(uuid())
  purchaseOrderId     String
  productId           String
  quantity            Decimal  @db.Decimal(12, 2)
  unitCost            Decimal  @db.Decimal(12, 2)
  allocatedLandedCost Decimal  @default(0.00) @db.Decimal(12, 2)
  finalLandedUnitCost Decimal  @default(0.00) @db.Decimal(12, 2)
  subtotal            Decimal  @db.Decimal(12, 2)
  createdAt           DateTime @default(now())

  purchaseOrder PurchaseOrder @relation(fields: [purchaseOrderId], references: [id], onDelete: Cascade)
  product       Product       @relation(fields: [productId], references: [id])

  @@index([purchaseOrderId])
  @@index([productId])
}

model PurchaseReceipt {
  id              String   @id @default(uuid())
  purchaseOrderId String
  receivedById    String
  receivedDate    DateTime @default(now())
  notes           String?
  createdAt       DateTime @default(now())

  purchaseOrder PurchaseOrder @relation(fields: [purchaseOrderId], references: [id])
  receivedBy    User          @relation(fields: [receivedById], references: [id])

  @@index([purchaseOrderId])
}

model Sale {
  id                     String        @id @default(uuid())
  invoiceNumber          String        @unique
  customerId             String
  cashierId              String
  subtotal               Decimal       @db.Decimal(12, 2)
  itemDiscountTotal      Decimal       @default(0.00) @db.Decimal(12, 2)
  transactionDiscount    Decimal       @default(0.00) @db.Decimal(12, 2)
  discountType           DiscountType  @default(FIXED)
  totalDiscount          Decimal       @default(0.00) @db.Decimal(12, 2)
  taxExclusiveTotal      Decimal       @default(0.00) @db.Decimal(12, 2)
  taxInclusiveTotal      Decimal       @default(0.00) @db.Decimal(12, 2)
  grandTotal             Decimal       @db.Decimal(12, 2)
  historicalCostTotal    Decimal       @default(0.00) @db.Decimal(12, 2)
  grossProfit            Decimal       @default(0.00) @db.Decimal(12, 2)
  paymentStatus          PaymentStatus @default(PAID)
  createdAt              DateTime      @default(now())
  updatedAt              DateTime      @updatedAt

  customer    Customer     @relation(fields: [customerId], references: [id])
  cashier     User         @relation(fields: [cashierId], references: [id])
  items       SaleItem[]
  payments    Payment[]
  saleReturns SaleReturn[]

  @@index([invoiceNumber])
  @@index([customerId])
  @@index([cashierId])
  @@index([createdAt])
}

model SaleItem {
  id                           String   @id @default(uuid())
  saleId                       String
  productId                    String
  quantity                     Decimal  @db.Decimal(12, 2)
  unitPrice                    Decimal  @db.Decimal(12, 2)
  itemDiscount                 Decimal  @default(0.00) @db.Decimal(12, 2)
  allocatedTransactionDiscount Decimal  @default(0.00) @db.Decimal(12, 2)
  effectivePrice               Decimal  @db.Decimal(12, 2)
  taxRate                      Decimal  @default(0.00) @db.Decimal(5, 2)
  taxAmount                    Decimal  @default(0.00) @db.Decimal(12, 2)
  subtotal                     Decimal  @db.Decimal(12, 2)
  historicalCost               Decimal  @default(0.00) @db.Decimal(12, 2)
  historicalGrossProfit        Decimal  @default(0.00) @db.Decimal(12, 2)
  createdAt                    DateTime @default(now())

  sale            Sale             @relation(fields: [saleId], references: [id], onDelete: Cascade)
  product         Product          @relation(fields: [productId], references: [id])
  saleReturnItems SaleReturnItem[]

  @@index([saleId])
  @@index([productId])
}

model Payment {
  id             String        @id @default(uuid())
  saleId         String?
  customerId     String?
  amount         Decimal       @db.Decimal(12, 2)
  amountTendered Decimal       @default(0.00) @db.Decimal(12, 2)
  changeDue      Decimal       @default(0.00) @db.Decimal(12, 2)
  paymentMethod  PaymentMethod @default(CASH)
  reference      String?
  cashierId      String?
  createdAt      DateTime      @default(now())

  sale Sale? @relation(fields: [saleId], references: [id], onDelete: SetNull)

  @@index([saleId])
}

model SaleReturn {
  id             String   @id @default(uuid())
  returnNumber   String   @unique
  originalSaleId String
  processedById  String
  subtotal       Decimal  @db.Decimal(12, 2)
  taxTotal       Decimal  @db.Decimal(12, 2)
  refundTotal    Decimal  @db.Decimal(12, 2)
  refundMethod   PaymentMethod @default(CASH)
  reason         String?
  createdAt      DateTime @default(now())

  originalSale Sale             @relation(fields: [originalSaleId], references: [id])
  processedBy  User             @relation(fields: [processedById], references: [id])
  items        SaleReturnItem[]

  @@index([returnNumber])
  @@index([originalSaleId])
}

model SaleReturnItem {
  id                 String   @id @default(uuid())
  saleReturnId       String
  originalSaleItemId String
  productId          String
  quantityReturned   Decimal  @db.Decimal(12, 2)
  unitRefundPrice    Decimal  @db.Decimal(12, 2)
  taxRefund          Decimal  @default(0.00) @db.Decimal(12, 2)
  totalRefund        Decimal  @db.Decimal(12, 2)
  createdAt          DateTime @default(now())

  saleReturn       SaleReturn @relation(fields: [saleReturnId], references: [id], onDelete: Cascade)
  originalSaleItem SaleItem   @relation(fields: [originalSaleItemId], references: [id])
  product          Product    @relation(fields: [productId], references: [id])

  @@index([saleReturnId])
  @@index([originalSaleItemId])
  @@index([productId])
}

model HeldCart {
  id         String   @id @default(uuid())
  cartName   String
  cashierId  String
  customerId String?
  note       String?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  cashier  User           @relation(fields: [cashierId], references: [id])
  customer Customer?      @relation(fields: [customerId], references: [id])
  items    HeldCartItem[]

  @@index([cashierId])
}

model HeldCartItem {
  id         String   @id @default(uuid())
  heldCartId String
  productId  String
  quantity   Decimal  @db.Decimal(12, 2)
  unitPrice  Decimal  @db.Decimal(12, 2)
  discount   Decimal  @default(0.00) @db.Decimal(12, 2)
  taxRate    Decimal  @default(0.00) @db.Decimal(5, 2)
  createdAt  DateTime @default(now())

  heldCart HeldCart @relation(fields: [heldCartId], references: [id], onDelete: Cascade)
  product  Product  @relation(fields: [productId], references: [id])

  @@index([heldCartId])
}

model ExpenseCategory {
  id          String   @id @default(uuid())
  name        String   @unique
  description String?
  createdAt   DateTime @default(now())

  expenses Expense[]
}

model Expense {
  id                String   @id @default(uuid())
  date              DateTime @default(now())
  expenseCategoryId String
  payee             String
  amount            Decimal  @db.Decimal(12, 2)
  paidVia           PaymentMethod @default(CASH)
  notes             String?
  createdById       String
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  category  ExpenseCategory @relation(fields: [expenseCategoryId], references: [id])
  createdBy User            @relation(fields: [createdById], references: [id])

  @@index([expenseCategoryId])
  @@index([date])
}

model BusinessSettings {
  id                       String   @id @default(uuid())
  businessName             String   @default("Records Manager Retail")
  phone                    String?  @default("+971 4 000 0000")
  email                    String?  @default("info@recordsmanager.ae")
  logoUrl                  String?
  address                  String?  @default("Dubai, United Arab Emirates")
  currencyCode             String   @default("AED")
  currencySymbol           String   @default("AED")
  defaultTaxRate           Decimal  @default(5.00) @db.Decimal(5, 2)
  pricesIncludeTax         Boolean  @default(true)
  defaultLowStockThreshold Int      @default(5)
  invoicePrefix            String   @default("INV-")
  receiptHeader            String?  @default("Thank you for shopping with us!")
  receiptFooter            String?  @default("Goods once sold can be returned within 14 days with original receipt.")
  createdAt                DateTime @default(now())
  updatedAt                DateTime @updatedAt
}

model ActivityLog {
  id          String   @id @default(uuid())
  userId      String?
  action      String
  module      String
  description String
  entityId    String?
  ipAddress   String?
  metadata    String?  @db.Text
  createdAt   DateTime @default(now())

  user User? @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([userId])
  @@index([module])
  @@index([action])
  @@index([createdAt])
}

model Notification {
  id        String           @id @default(uuid())
  type      NotificationType @default(SYSTEM)
  title     String
  message   String
  isRead    Boolean          @default(false)
  metadata  String?          @db.Text
  createdAt DateTime         @default(now())

  @@index([isRead])
  @@index([createdAt])
}

model IdempotencyRecord {
  id             String   @id @default(uuid())
  key            String   @unique
  route          String
  requestHash    String
  responseStatus Int
  responseBody   String   @db.Text
  expiresAt      DateTime
  createdAt      DateTime @default(now())

  @@index([key])
  @@index([expiresAt])
}
```

