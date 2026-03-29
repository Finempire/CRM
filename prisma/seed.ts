import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding GarmentOS database...");

  // ─── System Settings ──────────────────────────────────────────────────
  await prisma.systemSetting.createMany({
    skipDuplicates: true,
    data: [
      { key: "company_name", value: "GarmentOS", group: "GENERAL", isPublic: true },
      { key: "company_email", value: "admin@garmentos.com", group: "GENERAL" },
      { key: "company_phone", value: "+91 98765 43210", group: "GENERAL" },
      { key: "company_address", value: "123 Manufacturing District, Mumbai, India", group: "GENERAL" },
      { key: "default_currency", value: "INR", group: "FINANCIALS" },
      { key: "invoice_prefix", value: "INV", group: "FINANCIALS" },
      { key: "order_prefix", value: "ORD", group: "GENERAL" },
      { key: "inquiry_prefix", value: "INQ", group: "GENERAL" },
      { key: "po_prefix", value: "PO", group: "GENERAL" },
      { key: "grn_prefix", value: "GRN", group: "GENERAL" },
      { key: "payment_prefix", value: "PAY", group: "FINANCIALS" },
      { key: "shipment_prefix", value: "SHP", group: "GENERAL" },
      { key: "email_notifications", value: "true", group: "NOTIFICATIONS" },
      { key: "tna_warning_days", value: "3", group: "NOTIFICATIONS" },
      { key: "payment_overdue_days", value: "30", group: "FINANCIALS" },
    ],
  });

  // ─── Users ────────────────────────────────────────────────────────────
  const hashedPassword = await bcrypt.hash("garmentos@123", 12);

  const users = [
    {
      name: "Super Admin",
      email: "superadmin@garmentos.com",
      role: UserRole.SUPER_ADMIN,
      department: "Administration",
      designation: "System Administrator",
    },
    {
      name: "Accountant Admin",
      email: "accountant.admin@garmentos.com",
      role: UserRole.ACCOUNTANT_ADMIN,
      department: "Finance",
      designation: "Head of Finance",
    },
    {
      name: "Rajesh Sharma",
      email: "accountant@garmentos.com",
      role: UserRole.ACCOUNTANT,
      department: "Finance",
      designation: "Senior Accountant",
    },
    {
      name: "Priya Singh",
      email: "merch@garmentos.com",
      role: UserRole.MERCHANDISER,
      department: "Merchandising",
      designation: "Senior Merchandiser",
    },
    {
      name: "Amit Patel",
      email: "production@garmentos.com",
      role: UserRole.PRODUCTION_MANAGER,
      department: "Production",
      designation: "Production Manager",
    },
    {
      name: "Sunita Rao",
      email: "store@garmentos.com",
      role: UserRole.STORE_MANAGER,
      department: "Store",
      designation: "Store Manager",
    },
    {
      name: "Vikram Joshi",
      email: "procurement@garmentos.com",
      role: UserRole.PROCUREMENT_USER,
      department: "Procurement",
      designation: "Procurement Executive",
    },
    {
      name: "Neha Gupta",
      email: "logistics@garmentos.com",
      role: UserRole.LOGISTICS_USER,
      department: "Logistics",
      designation: "Logistics Coordinator",
    },
    {
      name: "CEO Management",
      email: "ceo@garmentos.com",
      role: UserRole.CEO,
      department: "Management",
      designation: "Chief Executive Officer",
    },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: {
        ...user,
        password: hashedPassword,
        emailVerified: new Date(),
      },
    });
  }
  console.log("✅ Users seeded");

  // ─── Buyers ───────────────────────────────────────────────────────────
  const buyers = [
    {
      code: "BUY001",
      name: "Global Fashion Ltd",
      shortName: "GFL",
      country: "UK",
      currency: "GBP",
      email: "purchasing@globalfashion.com",
      phone: "+44 20 1234 5678",
      billingAddress: "10 Fashion Street, London, UK",
      shippingAddress: "10 Fashion Street, London, UK",
      paymentTerms: "Net 30",
    },
    {
      code: "BUY002",
      name: "Trendy Retail Corp",
      shortName: "TRC",
      country: "USA",
      currency: "USD",
      email: "orders@trendyretail.com",
      phone: "+1 212 555 0100",
      billingAddress: "500 Fifth Avenue, New York, USA",
      shippingAddress: "500 Fifth Avenue, New York, USA",
      paymentTerms: "LC at Sight",
    },
    {
      code: "BUY003",
      name: "Euro Apparel GmbH",
      shortName: "EAG",
      country: "Germany",
      currency: "EUR",
      email: "sourcing@euroapparel.de",
      phone: "+49 30 12345 678",
      billingAddress: "Unter den Linden 10, Berlin, Germany",
      paymentTerms: "Net 45",
    },
    {
      code: "BUY004",
      name: "AUS Wholesale Pty",
      shortName: "AWP",
      country: "Australia",
      currency: "AUD",
      email: "buying@auswholes.com.au",
      phone: "+61 2 9876 5432",
      billingAddress: "123 Queen Street, Melbourne, Australia",
      paymentTerms: "Net 60",
    },
  ];

  for (const buyer of buyers) {
    await prisma.buyer.upsert({
      where: { code: buyer.code },
      update: {},
      create: buyer,
    });
  }
  console.log("✅ Buyers seeded");

  // ─── Vendors ──────────────────────────────────────────────────────────
  const vendors = [
    {
      code: "VND001",
      name: "Sunrise Textiles",
      type: "FABRIC",
      email: "sales@sunrisetextiles.com",
      phone: "+91 98001 11111",
      address: "Textile Market, Surat, Gujarat",
      paymentTerms: "Net 15",
      rating: 4,
    },
    {
      code: "VND002",
      name: "Premium Trims Co",
      type: "TRIMS",
      email: "info@premiumtrims.com",
      phone: "+91 98002 22222",
      address: "Trims Hub, Dharavi, Mumbai",
      paymentTerms: "Net 30",
      rating: 5,
    },
    {
      code: "VND003",
      name: "Artistica Embroidery",
      type: "JOB_WORK",
      email: "orders@artistica.in",
      phone: "+91 98003 33333",
      address: "Embroidery Zone, Kolkata",
      paymentTerms: "Advance 50%",
      rating: 4,
    },
    {
      code: "VND004",
      name: "Swift Logistics",
      type: "LOGISTICS",
      email: "ops@swiftlogistics.in",
      phone: "+91 98004 44444",
      address: "Transport Nagar, Delhi",
      paymentTerms: "Net 7",
      rating: 3,
    },
    {
      code: "VND005",
      name: "PrintPro Solutions",
      type: "JOB_WORK",
      email: "print@printpro.in",
      phone: "+91 98005 55555",
      address: "Print District, Tirupur",
      paymentTerms: "Advance 30%",
      rating: 4,
    },
  ];

  for (const vendor of vendors) {
    await prisma.vendor.upsert({
      where: { code: vendor.code },
      update: {},
      create: vendor,
    });
  }
  console.log("✅ Vendors seeded");

  // ─── Styles ───────────────────────────────────────────────────────────
  const styles = [
    { code: "STY001", name: "Classic Polo T-Shirt", category: "Knit" },
    { code: "STY002", name: "Slim Fit Chinos", category: "Woven" },
    { code: "STY003", name: "Stretch Denim Jeans", category: "Denim" },
    { code: "STY004", name: "Formal Oxford Shirt", category: "Woven" },
    { code: "STY005", name: "Athletic Track Pant", category: "Knit" },
    { code: "STY006", name: "Winter Hoodie", category: "Fleece" },
  ];

  for (const style of styles) {
    await prisma.style.upsert({
      where: { code: style.code },
      update: {},
      create: style,
    });
  }
  console.log("✅ Styles seeded");

  // ─── Stock Items ──────────────────────────────────────────────────────
  const stockItems = [
    { code: "STK001", name: "Cotton Interlock 180GSM White", category: "FABRIC", unit: "MTR", currentStock: 500, reorderLevel: 100 },
    { code: "STK002", name: "Cotton Interlock 180GSM Navy", category: "FABRIC", unit: "MTR", currentStock: 300, reorderLevel: 100 },
    { code: "STK003", name: "Polyester Satin Lining", category: "FABRIC", unit: "MTR", currentStock: 200, reorderLevel: 50 },
    { code: "STK004", name: "Metal Button 20mm Gold", category: "TRIMS", unit: "PCS", currentStock: 5000, reorderLevel: 1000 },
    { code: "STK005", name: "YKK Zipper 6 inch Black", category: "TRIMS", unit: "PCS", currentStock: 2000, reorderLevel: 500 },
    { code: "STK006", name: "Woven Label Main", category: "LABELS", unit: "PCS", currentStock: 10000, reorderLevel: 2000 },
    { code: "STK007", name: "Care Label", category: "LABELS", unit: "PCS", currentStock: 8000, reorderLevel: 2000 },
    { code: "STK008", name: "Polybag 12x16 inch", category: "PACKAGING", unit: "PCS", currentStock: 3000, reorderLevel: 1000 },
    { code: "STK009", name: "Carton Master Export", category: "PACKAGING", unit: "PCS", currentStock: 200, reorderLevel: 50 },
    { code: "STK010", name: "Hang Tag Premium", category: "TAGS", unit: "PCS", currentStock: 6000, reorderLevel: 1500 },
  ];

  for (const item of stockItems) {
    const exists = await prisma.stockItem.findUnique({ where: { code: item.code } });
    if (!exists) {
      await prisma.stockItem.create({
        data: {
          ...item,
          availableStock: item.currentStock,
          reservedStock: 0,
        },
      });
    }
  }
  console.log("✅ Stock items seeded");

  // ─── Sample Intake Form ───────────────────────────────────────────────
  await prisma.intakeForm.upsert({
    where: { token: "demo-intake-token-001" },
    update: {},
    create: {
      token: "demo-intake-token-001",
      buyerName: "Walk-In Client",
      description: "General Inquiry Form",
      isActive: true,
    },
  });
  console.log("✅ Intake forms seeded");

  console.log("\n✅ GarmentOS database seeded successfully!");
  console.log("\n🔐 Demo credentials:");
  console.log("   Super Admin:  superadmin@garmentos.com / garmentos@123");
  console.log("   Accountant:   accountant@garmentos.com / garmentos@123");
  console.log("   Merchandiser: merch@garmentos.com / garmentos@123");
  console.log("   Production:   production@garmentos.com / garmentos@123");
  console.log("   Store:        store@garmentos.com / garmentos@123");
  console.log("   Logistics:    logistics@garmentos.com / garmentos@123");
  console.log("   CEO:          ceo@garmentos.com / garmentos@123");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
