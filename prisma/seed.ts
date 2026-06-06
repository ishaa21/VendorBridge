import { PrismaClient, Role, VendorStatus, RFQStatus, QuotationStatus, POStatus, InvoiceStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log("🌱 Starting database seed...\n");

  // Clean the database in dependency order
  console.log("🧹 Cleaning existing data...");
  await prisma.invoice.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.quotationItem.deleteMany();
  await prisma.quotation.deleteMany();
  await prisma.rFQAttachment.deleteMany();
  await prisma.rFQVendor.deleteMany();
  await prisma.rFQItem.deleteMany();
  await prisma.rFQ.deleteMany();
  await prisma.category.deleteMany();
  await prisma.vendorStatusHistory.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.user.deleteMany();

  // 1. Create Core Users
  console.log("👤 Creating users...");
  const passwordHash = await bcrypt.hash("Password@123", 12);

  const admin = await prisma.user.create({
    data: {
      firstName: "Admin",
      lastName: "System",
      email: "admin@vendorbridge.com",
      phone: "+1-555-0101",
      country: "United States",
      role: Role.ADMIN,
      passwordHash,
      isActive: true,
      emailVerified: new Date(),
    },
  });

  const procurement = await prisma.user.create({
    data: {
      firstName: "Sarah",
      lastName: "Officer",
      email: "procurement@vendorbridge.com",
      phone: "+1-555-0102",
      country: "United States",
      role: Role.PROCUREMENT_OFFICER,
      passwordHash,
      isActive: true,
      emailVerified: new Date(),
    },
  });

  const manager = await prisma.user.create({
    data: {
      firstName: "James",
      lastName: "Manager",
      email: "manager@vendorbridge.com",
      phone: "+1-555-0104",
      country: "United Kingdom",
      role: Role.MANAGER,
      passwordHash,
      isActive: true,
      emailVerified: new Date(),
    },
  });

  const vendorUser = await prisma.user.create({
    data: {
      firstName: "Rajesh",
      lastName: "Kumar",
      email: "vendor@vendorbridge.com",
      phone: "+91-98765-43210",
      country: "India",
      role: Role.VENDOR,
      passwordHash,
      isActive: true,
      emailVerified: new Date(),
    },
  });

  console.log("✅ Seeded users: Admin, Procurement, Manager, Vendor User");

  // 2. Create Categories
  console.log("📂 Creating categories...");
  await prisma.category.createMany({
    data: [
      { name: "Furniture", description: "Office desks, chairs, cabinetry, and partitions" },
      { name: "IT Equipment", description: "Laptops, servers, switches, and network peripherals" },
      { name: "Office Supplies", description: "Paper, stationery, inks, and daily consumables" },
      { name: "Services", description: "Consulting, facility maintenance, and professional services" },
    ],
  });

  // 3. Create Vendors
  console.log("🏢 Creating vendors...");
  const supremeFurniture = await prisma.vendor.create({
    data: {
      vendorName: "Supreme Furniture Ltd",
      companyName: "Supreme Furniture Corp",
      category: "Furniture",
      gstNumber: "27AAAAA1111A1Z1",
      panNumber: "AAAAA1111A",
      contactPerson: "Rajesh Kumar",
      phone: "+91-98765-43210",
      email: "vendor@vendorbridge.com",
      address: "101, Industrial Area Phase II, Mumbai",
      country: "India",
      status: VendorStatus.ACTIVE,
      createdById: admin.id,
      userId: vendorUser.id, // Linked to vendor user
      notes: "Primary supplier for executive office desks and ergonomic chairs.",
    },
  });

  const nextGenIT = await prisma.vendor.create({
    data: {
      vendorName: "NextGen IT Solutions",
      companyName: "NextGen Technologies Inc",
      category: "IT Equipment",
      gstNumber: "27BBBBB2222B2Z2",
      panNumber: "BBBBB2222B",
      contactPerson: "John Tech",
      phone: "+1-555-0201",
      email: "contact@nextgenit.com",
      address: "500 Innovation Way, Silicon Valley, CA",
      country: "United States",
      status: VendorStatus.ACTIVE,
      createdById: admin.id,
      notes: "Sells laptops, networking peripherals, and cloud storage servers.",
    },
  });

  const metroStationers = await prisma.vendor.create({
    data: {
      vendorName: "Metro Stationers",
      companyName: "Metro Paper and Office Supplies",
      category: "Office Supplies",
      gstNumber: "27CCCCC3333C3Z3",
      panNumber: "CCCCC3333C",
      contactPerson: "Alice Pen",
      phone: "+44-20-7946-0958",
      email: "orders@metrostationers.co.uk",
      address: "88 Kingsway Road, London",
      country: "United Kingdom",
      status: VendorStatus.PENDING,
      createdById: procurement.id,
      notes: "Pending registration details verification.",
    },
  });

  const badSupplier = await prisma.vendor.create({
    data: {
      vendorName: "Cheapo Supply",
      companyName: "Cheapo Supply Ltd",
      category: "Office Supplies",
      gstNumber: "27DDDDD4444D4Z4",
      panNumber: "DDDDD4444D",
      contactPerson: "John Sly",
      phone: "+1-555-0309",
      email: "sales@cheaposupply.com",
      address: "12 Black Market Street, Las Vegas, NV",
      country: "United States",
      status: VendorStatus.BLOCKED,
      createdById: admin.id,
      notes: "Blocked due to repeated delays and delivery of counterfeit items.",
    },
  });

  console.log("✅ Seeded vendors: Supreme Furniture (Active), NextGen IT (Active), Metro Stationers (Pending), Cheapo Supply (Blocked)");

  // 4. Create RFQs
  console.log("📝 Creating RFQs...");
  const deadlineFurniture = new Date();
  deadlineFurniture.setDate(deadlineFurniture.getDate() + 30); // 30 days from now

  const rfqFurniture = await prisma.rFQ.create({
    data: {
      rfqNumber: "RFQ-2026-0001",
      title: "Office Furniture Procurement Q2",
      category: "Furniture",
      description: "Requesting bids for ergonomic desk chairs and executive conference tables for the Mumbai headquarters renovation.",
      deadline: deadlineFurniture,
      status: RFQStatus.OPEN,
      createdById: procurement.id,
      items: {
        create: [
          { itemName: "Ergonomic Mesh Chair", quantity: 50, unit: "PCS", estimatedPrice: 120.0, specifications: "High back, adjustable armrests, lumbar support, dark gray mesh." },
          { itemName: "Executive Boardroom Table", quantity: 2, unit: "PCS", estimatedPrice: 1500.0, specifications: "12-seater, walnut finish, integrated power sockets and cable channels." },
        ],
      },
      invited: {
        create: [
          { vendorId: supremeFurniture.id },
        ],
      },
    },
  });

  const deadlineIT = new Date();
  deadlineIT.setDate(deadlineIT.getDate() - 5); // Closed 5 days ago

  const rfqIT = await prisma.rFQ.create({
    data: {
      rfqNumber: "RFQ-2026-0002",
      title: "Developer Laptop Refresh",
      category: "IT Equipment",
      description: "Bids for standard developer laptops. Specifications require 32GB RAM and 1TB SSD.",
      deadline: deadlineIT,
      status: RFQStatus.CLOSED,
      createdById: procurement.id,
      items: {
        create: [
          { itemName: "Developer Laptop Core-i7", quantity: 15, unit: "PCS", estimatedPrice: 1500.0, specifications: "32GB RAM, 1TB NVMe SSD, 15.6 inch screen, US keyboard layout." },
        ],
      },
      invited: {
        create: [
          { vendorId: nextGenIT.id },
        ],
      },
    },
  });

  console.log("✅ Seeded RFQs: RFQ-2026-0001 (Open), RFQ-2026-0002 (Closed)");

  // 5. Create Quotations
  console.log("💰 Creating Quotations...");
  // Supplier supremeFurniture submits quotation for RFQ-2026-0001
  const quoteFurniture = await prisma.quotation.create({
    data: {
      quotationNumber: "QT-2026-0001",
      rfqId: rfqFurniture.id,
      vendorId: supremeFurniture.id,
      subtotal: 7500.0, // 50 chairs * $100 + 2 tables * $1250
      taxRate: 18.0,
      taxAmount: 1350.0,
      grandTotal: 8850.0,
      notes: "Delivery within 14 days of PO. 1-year replacement warranty on all moving mechanical parts.",
      status: QuotationStatus.SUBMITTED,
      submittedAt: new Date(),
      items: {
        create: [
          { itemName: "Ergonomic Mesh Chair", quantity: 50, unitPrice: 100.0, total: 5000.0, deliveryDays: 10 },
          { itemName: "Executive Boardroom Table", quantity: 2, unitPrice: 1250.0, total: 2500.0, deliveryDays: 14 },
        ],
      },
    },
  });

  // Supplier nextGenIT submits quotation for RFQ-2026-0002 (Approved)
  const quoteIT = await prisma.quotation.create({
    data: {
      quotationNumber: "QT-2026-0002",
      rfqId: rfqIT.id,
      vendorId: nextGenIT.id,
      subtotal: 21000.0, // 15 laptops * $1400
      taxRate: 8.0,
      taxAmount: 1680.0,
      grandTotal: 22680.0,
      notes: "Includes standard setup and macOS Ventura pre-installed. Next-day shipping.",
      status: QuotationStatus.APPROVED,
      submittedAt: new Date(deadlineIT.getTime() - 1000 * 60 * 60 * 24), // 1 day before deadline
      items: {
        create: [
          { itemName: "Developer Laptop Core-i7", quantity: 15, unitPrice: 1400.0, total: 21000.0, deliveryDays: 3 },
        ],
      },
    },
  });

  console.log("✅ Seeded Quotations: QT-2026-0001 (Submitted), QT-2026-0002 (Approved)");

  // 6. Create Purchase Orders
  console.log("📦 Creating Purchase Orders...");
  const poDate = new Date();
  poDate.setDate(poDate.getDate() + 3);

  const purchaseOrder = await prisma.purchaseOrder.create({
    data: {
      poNumber: "PO-2026-0001",
      quotationId: quoteIT.id,
      vendorId: nextGenIT.id,
      totalAmount: 22680.0,
      status: POStatus.ISSUED,
      deliveryDate: poDate,
    },
  });

  console.log("✅ Seeded Purchase Order: PO-2026-0001 ($22,680.00)");

  // 7. Create Invoices
  console.log("🧾 Creating Invoices...");
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber: "INV-2026-0001",
      poId: purchaseOrder.id,
      vendorId: nextGenIT.id,
      amount: 22680.0,
      dueDate: dueDate,
      status: InvoiceStatus.SUBMITTED,
    },
  });

  console.log("✅ Seeded Invoice: INV-2026-0001 ($22,680.00)");

  // 8. Seed historic analytical data for charts (Last 6 Months spend)
  // Let's create dummy orders and invoices to show spend data
  console.log("📊 Seeding historical analytics spend data...");
  const now = new Date();
  const months = ["January", "February", "March", "April", "May", "June"];

  // Seed invoices spread over the last 6 months
  const historicVendor = nextGenIT;
  for (let i = 0; i < 6; i++) {
    const invDate = new Date();
    invDate.setMonth(now.getMonth() - i);
    // Spend values: between $5,000 and $45,000
    const spendAmount = 15000 + Math.random() * 25000;
    const histPO = await prisma.purchaseOrder.create({
      data: {
        poNumber: `PO-HIST-000${i}`,
        quotationId: quoteIT.id, // Reuse quoteIT as a placeholder relation
        vendorId: historicVendor.id,
        totalAmount: spendAmount,
        status: POStatus.DELIVERED,
        deliveryDate: invDate,
        createdAt: invDate,
      },
    });

    await prisma.invoice.create({
      data: {
        invoiceNumber: `INV-HIST-000${i}`,
        poId: histPO.id,
        vendorId: historicVendor.id,
        amount: spendAmount,
        dueDate: invDate,
        status: InvoiceStatus.PAID,
        createdAt: invDate,
      },
    });
  }

  // Create an Activity Log to register seeding activity
  await prisma.activityLog.create({
    data: {
      userId: admin.id,
      action: "DATABASE_SEEDED",
      entityType: "System",
      entityId: "Seed",
      metadata: { seededRows: 24 },
    },
  });

  console.log("\n🎉 Database seed completed successfully!");
}

main()
  .catch((error: unknown) => {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
