import "dotenv/config";
import bcrypt from "bcryptjs";
import prisma from "../src/config/database.js";

const DEMO_CODE = "AQUAX-DEMO-001";
const PANCHAYAT_ID = "00000000-0000-4000-8000-000000000001";
const ADMIN_ID = "00000000-0000-4000-8000-000000000002";
const OPERATOR_ID = "00000000-0000-4000-8000-000000000003";

const ADMIN_EMAIL = "demo@aquax.local";
const ADMIN_PASSWORD = "AquaXDemo@2026";
const OPERATOR_EMAIL = "operator@aquax.local";
const OPERATOR_PASSWORD = "AquaXOperator@2026";

const id = (number) =>
  `00000000-0000-4000-8000-${String(number).padStart(12, "0")}`;

const daysAgo = (days) =>
  new Date(Date.now() - days * 24 * 60 * 60 * 1000);

const daysAhead = (days) =>
  new Date(Date.now() + days * 24 * 60 * 60 * 1000);

const monthStart = (offset = 0) => {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1)
  );
};

const monthEnd = (offset = 0) =>
  new Date(
    Date.UTC(
      new Date().getUTCFullYear(),
      new Date().getUTCMonth() + offset + 1,
      0,
      12,
      0,
      0
    )
  );

async function upsertById(model, recordId, data) {
  return model.upsert({
    where: { id: recordId },
    create: { id: recordId, ...data },
    update: data,
  });
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Demo seeding is disabled in production.");
  }

  if (process.env.ENABLE_DEMO_SEED !== "true") {
    throw new Error(
      "Set ENABLE_DEMO_SEED=true to allow demo seeding."
    );
  }

  const adminPasswordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  const operatorPasswordHash = await bcrypt.hash(OPERATOR_PASSWORD, 12);

  // 1. Panchayat

  const panchayat = await prisma.panchayat.upsert({
    where: { code: DEMO_CODE },
    create: {
      id: PANCHAYAT_ID,
      name: "Sundarpur Gram Panchayat (Demo)",
      code: DEMO_CODE,
      district: "Bhopal",
      state: "Madhya Pradesh",
    },
    update: {
      name: "Sundarpur Gram Panchayat (Demo)",
      district: "Bhopal",
      state: "Madhya Pradesh",
    },
  });

  // 2. Demo users

  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    create: {
      id: ADMIN_ID,
      name: "AquaX Demo Administrator",
      email: ADMIN_EMAIL,
      password: adminPasswordHash,
      role: "PANCHAYAT_ADMIN",
      panchayatId: panchayat.id,
      isActive: true,
    },
    update: {
      name: "AquaX Demo Administrator",
      password: adminPasswordHash,
      role: "PANCHAYAT_ADMIN",
      panchayatId: panchayat.id,
      isActive: true,
    },
  });

  await prisma.user.upsert({
    where: { email: OPERATOR_EMAIL },
    create: {
      id: OPERATOR_ID,
      name: "AquaX Demo Operator",
      email: OPERATOR_EMAIL,
      password: operatorPasswordHash,
      role: "OPERATOR",
      panchayatId: panchayat.id,
      isActive: true,
    },
    update: {
      name: "AquaX Demo Operator",
      password: operatorPasswordHash,
      role: "OPERATOR",
      panchayatId: panchayat.id,
      isActive: true,
    },
  });

  // 3. Villages

  const villages = [
    { id: id(10), name: "Rampur" },
    { id: id(11), name: "Shivpur" },
    { id: id(12), name: "Devgaon" },
    { id: id(13), name: "Haripura" },
  ];

  for (const village of villages) {
    await upsertById(prisma.village, village.id, {
      name: village.name,
      panchayatId: panchayat.id,
    });
  }

  // 4. Water schemes

  const schemes = [
    {
      id: id(20),
      name: "Rampur Household Tap Connection",
      villageId: id(10),
      description: "Household tap connections and distribution network.",
    },
    {
      id: id(21),
      name: "Shivpur Water Supply Augmentation",
      villageId: id(11),
      description: "Village water supply augmentation and storage.",
    },
    {
      id: id(22),
      name: "Devgaon Source Sustainability",
      villageId: id(12),
      description: "Source strengthening and water treatment improvements.",
    },
    {
      id: id(23),
      name: "Haripura Pipeline Renewal",
      villageId: id(13),
      description: "Replacement of ageing distribution pipelines.",
    },
    {
      id: id(24),
      name: "Regional Water Treatment Upgrade",
      villageId: id(10),
      description: "Treatment plant and chlorination upgrades.",
    },
  ];

  for (const scheme of schemes) {
    await upsertById(prisma.scheme, scheme.id, {
      ...scheme,
      panchayatId: panchayat.id,
    });
  }

  // 5. Infrastructure assets

  const assetData = [
    ["Rampur Main Borewell Pump", "PUMP", "ACTIVE", 20, 23.2588, 77.4058],
    ["Rampur Overhead Tank", "TANK", "ACTIVE", 20, 23.2602, 77.4081],
    ["Rampur Distribution Pipeline A", "PIPELINE", "ACTIVE", 20, 23.2569, 77.4100],
    ["Rampur Isolation Valve 01", "VALVE", "ACTIVE", 20, 23.2557, 77.4067],
    ["Shivpur Booster Pump", "PUMP", "UNDER_MAINTENANCE", 21, 23.2651, 77.4182],
    ["Shivpur Storage Tank", "TANK", "ACTIVE", 21, 23.2672, 77.4159],
    ["Devgaon Treatment Plant", "TREATMENT_PLANT", "ACTIVE", 22, 23.2499, 77.4172],
    ["Devgaon Pipeline North", "PIPELINE", "ACTIVE", 22, 23.2511, 77.4213],
    ["Haripura Distribution Pump", "PUMP", "DAMAGED", 23, 23.2742, 77.3987],
    ["Haripura Main Valve", "VALVE", "ACTIVE", 23, 23.2720, 77.4011],
    ["Regional Chlorination Unit", "OTHER", "ACTIVE", 24, 23.2546, 77.4120],
    ["Regional Treatment Filter", "TREATMENT_PLANT", "INACTIVE", 24, 23.2534, 77.4148],
  ];

  for (let index = 0; index < assetData.length; index++) {
    const [name, type, status, schemeId, latitude, longitude] =
      assetData[index];

    await upsertById(prisma.asset, id(30 + index), {
      name,
      type,
      status,
      description: `${type.replaceAll("_", " ")} serving the ${name.split(" ")[0]} area. Demo record.`,
      latitude,
      longitude,
      installationDate: new Date(
        Date.UTC(2021 + (index % 4), index % 12, 12)
      ),
      schemeId: id(schemeId),
    });
  }

  // 6. Suppliers

  const suppliers = [
    {
      id: id(60),
      name: "Shakti Pump & Electricals",
      phone: "9000000101",
      address: "Industrial Area, Bhopal",
    },
    {
      id: id(61),
      name: "Central Pipe Traders",
      phone: "9000000102",
      address: "Karond Market, Bhopal",
    },
    {
      id: id(62),
      name: "Jal Jeevan Supplies",
      phone: "9000000103",
      address: "Sehore Road, Bhopal",
    },
    {
      id: id(63),
      name: "Clean Water Chemicals",
      phone: "9000000104",
      address: "Govindpura, Bhopal",
    },
  ];

  for (const supplier of suppliers) {
    await upsertById(prisma.supplier, supplier.id, {
      ...supplier,
      panchayatId: panchayat.id,
    });
  }

  // 7. Inventory and stock movements

  const inventory = [
    {
      id: id(70),
      name: "PVC Pipeline (110 mm)",
      category: "Pipes & Fittings",
      unit: "metre",
      quantity: 240,
      reorderLevel: 100,
      unitCost: "185.00",
      purchase: 300,
      consume: 60,
      supplierId: id(61),
    },
    {
      id: id(71),
      name: "HDPE Pipeline (63 mm)",
      category: "Pipes & Fittings",
      unit: "metre",
      quantity: 75,
      reorderLevel: 100,
      unitCost: "92.50",
      purchase: 100,
      consume: 25,
      supplierId: id(61),
    },
    {
      id: id(72),
      name: "Gate Valve (50 mm)",
      category: "Valves",
      unit: "piece",
      quantity: 18,
      reorderLevel: 10,
      unitCost: "1450.00",
      purchase: 20,
      consume: 2,
      supplierId: id(62),
    },
    {
      id: id(73),
      name: "Chlorine Tablets",
      category: "Treatment Chemicals",
      unit: "kg",
      quantity: 12,
      reorderLevel: 15,
      unitCost: "320.00",
      purchase: 20,
      consume: 8,
      supplierId: id(63),
    },
    {
      id: id(74),
      name: "Pump Lubricating Oil",
      category: "Consumables",
      unit: "litre",
      quantity: 45,
      reorderLevel: 20,
      unitCost: "410.00",
      purchase: 50,
      consume: 5,
      supplierId: id(60),
    },
    {
      id: id(75),
      name: "Domestic Water Meter",
      category: "Meters",
      unit: "piece",
      quantity: 8,
      reorderLevel: 10,
      unitCost: "780.00",
      purchase: 10,
      consume: 2,
      supplierId: id(62),
    },
  ];

  for (const item of inventory) {
    await upsertById(prisma.inventoryItem, item.id, {
      name: item.name,
      category: item.category,
      unit: item.unit,
      quantity: item.quantity,
      reorderLevel: item.reorderLevel,
      unitCost: item.unitCost,
      panchayatId: panchayat.id,
    });

    const suffix = Number(item.id.slice(-2)) - 70;
    const baseMovementId = 80 + suffix * 2;

    await upsertById(prisma.stockMovement, id(baseMovementId), {
      itemId: item.id,
      userId: admin.id,
      supplierId: item.supplierId,
      type: "PURCHASE",
      quantity: item.purchase,
      unitCost: item.unitCost,
      reference: `DEMO-PO-${String(suffix + 1).padStart(3, "0")}`,
      notes: "Opening demo purchase for presentation.",
      createdAt: daysAgo(50 + suffix * 2),
    });

    await upsertById(prisma.stockMovement, id(baseMovementId + 1), {
      itemId: item.id,
      userId: admin.id,
      supplierId: null,
      type: "CONSUMPTION",
      quantity: item.consume,
      unitCost: item.unitCost,
      reference: `DEMO-USE-${String(suffix + 1).padStart(3, "0")}`,
      notes: "Demo issue of material for maintenance work.",
      createdAt: daysAgo(12 + Number(item.id.slice(-2))),
    });
  }

  // 8. Consumers

  const consumerSeed = [
    ["CON-1001", "Aarav Sharma", "9000001001", 10, 650, "12 Ward 1, Rampur"],
    ["CON-1002", "Meera Patel", "9000001002", 10, 700, "18 Ward 1, Rampur"],
    ["CON-1003", "Rohan Verma", "9000001003", 10, 650, "4 Main Road, Rampur"],
    ["CON-1004", "Ananya Gupta", "9000001004", 11, 600, "21 School Road, Shivpur"],
    ["CON-1005", "Kabir Khan", "9000001005", 11, 750, "7 Ward 2, Shivpur"],
    ["CON-1006", "Sana Ali", "9000001006", 11, 650, "14 Market Lane, Shivpur"],
    ["CON-1007", "Ishita Jain", "9000001007", 12, 600, "3 Temple Street, Devgaon"],
    ["CON-1008", "Vivaan Joshi", "9000001008", 12, 700, "9 Ward 1, Devgaon"],
    ["CON-1009", "Diya Nair", "9000001009", 12, 650, "16 Lake Road, Devgaon"],
    ["CON-1010", "Aditya Rao", "9000001010", 13, 600, "2 Ward 1, Haripura"],
    ["CON-1011", "Myra Singh", "9000001011", 13, 750, "11 Panchayat Road, Haripura"],
    ["CON-1012", "Arjun Das", "9000001012", 13, 650, "19 Ward 2, Haripura"],
  ];

  for (let index = 0; index < consumerSeed.length; index++) {
    const [consumerNo, name, phone, villageId, monthlyRate, address] =
      consumerSeed[index];

    await upsertById(prisma.consumer, id(100 + index), {
      consumerNo,
      name,
      phone,
      address,
      connectionDate: new Date(
        Date.UTC(2022 + (index % 3), index % 12, 5 + index)
      ),
      monthlyRate: monthlyRate.toFixed(2),
      status:
        index === 11
          ? "DISCONNECTED"
          : index === 10
            ? "INACTIVE"
            : "ACTIVE",
      villageId: id(villageId),
      panchayatId: panchayat.id,
    });
  }

  // 9. Bills

  const billIds = [];

  for (let index = 0; index < consumerSeed.length; index++) {
    const consumerId = id(100 + index);
    const amount = Number(consumerSeed[index][4]);
    const isPastDue = index >= 8 && index <= 9;
    const dueDate = isPastDue
      ? daysAgo(6 + index)
      : daysAhead(8 + index);

    const billId = id(120 + index);

    const status =
      index <= 4
        ? "PAID"
        : index <= 7
          ? "PARTIALLY_PAID"
          : isPastDue
            ? "OVERDUE"
            : "PENDING";

    await upsertById(prisma.bill, billId, {
      consumerId,
      periodStart: monthStart(-1),
      periodEnd: monthEnd(-1),
      dueDate,
      amount: amount.toFixed(2),
      status,
    });

    billIds.push({ id: billId, amount, index, status });
  }

  // 10. Payments and linked financial receipts

  const paymentSpecs = [
    { billIndex: 0, amountRatio: 1, days: 2, method: "UPI" },
    { billIndex: 1, amountRatio: 1, days: 14, method: "CASH" },
    { billIndex: 2, amountRatio: 1, days: 38, method: "UPI" },
    { billIndex: 3, amountRatio: 1, days: 68, method: "NET_BANKING" },
    { billIndex: 4, amountRatio: 1, days: 112, method: "CASH" },
    { billIndex: 5, amountRatio: 0.5, days: 5, method: "UPI" },
    { billIndex: 6, amountRatio: 0.4, days: 34, method: "CASH" },
    { billIndex: 7, amountRatio: 0.6, days: 82, method: "UPI" },
  ];

  for (let index = 0; index < paymentSpecs.length; index++) {
    const spec = paymentSpecs[index];
    const bill = billIds[spec.billIndex];
    const paymentId = id(150 + index);
    const paidAt = daysAgo(spec.days);
    const amount = Number(
      (bill.amount * spec.amountRatio).toFixed(2)
    );

    await upsertById(prisma.payment, paymentId, {
      billId: bill.id,
      amount: amount.toFixed(2),
      method: spec.method,
      status: "SUCCESS",
      reference: `DEMO-PAY-${String(index + 1).padStart(3, "0")}`,
      paidAt,
      reversedAt: null,
      reversedReason: null,
    });

    await upsertById(prisma.financialEntry, id(180 + index), {
      panchayatId: panchayat.id,
      recordedById: admin.id,
      type: "RECEIPT",
      category: "Water bill payment",
      description: `Payment for demo bill ${bill.id}`,
      amount: amount.toFixed(2),
      source: `PAYMENT:${paymentId}`,
      paymentId,
      date: paidAt,
    });
  }

  // 11. Other finance entries

  const manualFinance = [
    {
      id: id(200),
      type: "RECEIPT",
      category: "Government Grant",
      description: "Quarterly rural water supply operation grant.",
      amount: "25000.00",
      source: "DEMO-GRANT-Q3",
      date: daysAgo(20),
    },
    {
      id: id(201),
      type: "RECEIPT",
      category: "Connection Charges",
      description: "New household water connection charges.",
      amount: "3600.00",
      source: "DEMO-CONNECTIONS-01",
      date: daysAgo(9),
    },
    {
      id: id(202),
      type: "EXPENSE",
      category: "Electricity",
      description: "Electricity charges for village pump houses.",
      amount: "4850.00",
      source: "DEMO-POWER-11",
      date: daysAgo(7),
    },
    {
      id: id(203),
      type: "EXPENSE",
      category: "Pump Repair",
      description: "Replacement of pump bearing and service labour.",
      amount: "3200.00",
      source: "DEMO-REPAIR-07",
      date: daysAgo(3),
    },
    {
      id: id(204),
      type: "EXPENSE",
      category: "Water Treatment",
      description: "Chlorination and water quality consumables.",
      amount: "1850.00",
      source: "DEMO-TREAT-03",
      date: daysAgo(1),
    },
  ];

  for (const entry of manualFinance) {
    await upsertById(prisma.financialEntry, entry.id, {
      panchayatId: panchayat.id,
      recordedById: admin.id,
      ...entry,
    });
  }

  // 12. Maintenance records

  const maintenanceSeed = [
    {
      id: id(220),
      assetId: id(30),
      title: "Routine pump inspection",
      description: "Check motor vibration, starter and discharge pressure.",
      status: "COMPLETED",
      cost: "1250.00",
      reportedAt: daysAgo(25),
      completedAt: daysAgo(23),
    },
    {
      id: id(221),
      assetId: id(34),
      title: "Booster pump overheating",
      description: "Motor temperature is high during peak demand. Inspect bearings and cooling.",
      status: "IN_PROGRESS",
      cost: "2800.00",
      reportedAt: daysAgo(2),
      completedAt: null,
    },
    {
      id: id(222),
      assetId: id(38),
      title: "Haripura pump not starting",
      description: "Starter trips repeatedly. Electrical inspection required.",
      status: "REPORTED",
      cost: "0.00",
      reportedAt: daysAgo(1),
      completedAt: null,
    },
    {
      id: id(223),
      assetId: id(31),
      title: "Overhead tank cleaning",
      description: "Scheduled cleaning and inspection of outlet valve.",
      status: "COMPLETED",
      cost: "1800.00",
      reportedAt: daysAgo(45),
      completedAt: daysAgo(43),
    },
    {
      id: id(224),
      assetId: id(37),
      title: "Pipeline joint leakage",
      description: "Minor leakage near the north distribution branch.",
      status: "REPORTED",
      cost: "0.00",
      reportedAt: daysAgo(4),
      completedAt: null,
    },
  ];

  for (const record of maintenanceSeed) {
    await upsertById(prisma.maintenanceRecord, record.id, {
      ...record,
      reportedById: admin.id,
    });
  }

  console.log("\nAquaX demo data is ready.");
  console.log("Panchayat: Sundarpur Gram Panchayat (Demo)");
  console.log(`Admin login: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  console.log(`Operator login: ${OPERATOR_EMAIL} / ${OPERATOR_PASSWORD}`);
  console.log("Seed is repeatable and does not delete existing records.");
}

main()
  .catch((error) => {
    console.error("Demo seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });