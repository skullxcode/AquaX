import prisma from "../config/database.js";

const fail = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });
const ensurePanchayat = (panchayatId) => {
  if (!panchayatId) throw fail("This account is not linked to a Panchayat.", 403);
};

const reportDateRange = (from, to) => {
  const parseDay = (value, endOfDay = false) => {
    if (!value) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
      throw fail("Report dates must use YYYY-MM-DD format.", 400);
    }
    const date = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`);
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw fail("A report date is invalid.", 400);
    return date;
  };
  const start = parseDay(from) || new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1));
  const end = parseDay(to, true) || new Date();
  if (start > end) throw fail("The report start date must be on or before the end date.", 400);
  return { start, end };
};

// Schemes
export const listSchemes = (panchayatId) => prisma.scheme.findMany({
  where: { panchayatId }, include: { village: { select: { id: true, name: true } }, _count: { select: { assets: true } } }, orderBy: { createdAt: "desc" },
});
export const createScheme = async (panchayatId, data) => {
  ensurePanchayat(panchayatId);
  const village = await prisma.village.findFirst({ where: { id: data.villageId, panchayatId } });
  if (!village) throw fail("Selected village was not found in your Panchayat.", 404);
  return prisma.scheme.create({ data: { ...data, panchayatId }, include: { village: true } });
};
export const updateScheme = async (panchayatId, id, data) => {
  const existing = await prisma.scheme.findFirst({ where: { id, panchayatId } });
  if (!existing) return null;
  if (data.villageId) {
    const village = await prisma.village.findFirst({ where: { id: data.villageId, panchayatId } });
    if (!village) throw fail("Selected village was not found in your Panchayat.", 404);
  }
  return prisma.scheme.update({ where: { id }, data, include: { village: true } });
};
export const deleteScheme = async (panchayatId, id) => {
  const existing = await prisma.scheme.findFirst({ where: { id, panchayatId }, include: { _count: { select: { assets: true } } } });
  if (!existing) return null;
  if (existing._count.assets) throw fail("This scheme has assets. Move or delete its assets before deleting the scheme.", 409);
  return prisma.scheme.delete({ where: { id } });
};

// Assets
const assetInclude = { scheme: { include: { village: { select: { id: true, name: true } } } }, _count: { select: { maintenance: true } } };
export const listAssets = (panchayatId) => prisma.asset.findMany({ where: { scheme: { is: { panchayatId } } }, include: assetInclude, orderBy: { createdAt: "desc" } });
export const createAsset = async (panchayatId, data) => {
  ensurePanchayat(panchayatId);
  const scheme = await prisma.scheme.findFirst({ where: { id: data.schemeId, panchayatId } });
  if (!scheme) throw fail("Selected scheme was not found in your Panchayat.", 404);
  return prisma.asset.create({ data, include: assetInclude });
};
export const updateAsset = async (panchayatId, id, data) => {
  const existing = await prisma.asset.findFirst({ where: { id, scheme: { is: { panchayatId } } } });
  if (!existing) return null;
  if (data.schemeId) {
    const scheme = await prisma.scheme.findFirst({ where: { id: data.schemeId, panchayatId } });
    if (!scheme) throw fail("Selected scheme was not found in your Panchayat.", 404);
  }
  return prisma.asset.update({ where: { id }, data, include: assetInclude });
};
export const deleteAsset = async (panchayatId, id) => {
  const existing = await prisma.asset.findFirst({ where: { id, scheme: { is: { panchayatId } } }, include: { _count: { select: { maintenance: true } } } });
  if (!existing) return null;
  if (existing._count.maintenance) throw fail("This asset has maintenance history and cannot be deleted.", 409);
  return prisma.asset.delete({ where: { id } });
};

// Maintenance
const maintenanceInclude = { asset: { include: { scheme: { select: { id: true, name: true, panchayatId: true }, } } }, reportedBy: { select: { id: true, name: true } } };
export const listMaintenance = (panchayatId) => prisma.maintenanceRecord.findMany({ where: { asset: { is: { scheme: { is: { panchayatId } } } } }, include: maintenanceInclude, orderBy: { reportedAt: "desc" } });
export const createMaintenance = async (panchayatId, userId, data) => prisma.$transaction(async (tx) => {
  const asset = await tx.asset.findFirst({ where: { id: data.assetId, scheme: { is: { panchayatId } } } });
  if (!asset) throw fail("Selected asset was not found in your Panchayat.", 404);
  const status = data.status || "REPORTED";
  const record = await tx.maintenanceRecord.create({
    data: { ...data, status, completedAt: status === "COMPLETED" ? new Date() : undefined, reportedById: userId },
    include: maintenanceInclude,
  });
  const openCount = await tx.maintenanceRecord.count({ where: { assetId: asset.id, status: { in: ["REPORTED", "IN_PROGRESS"] } } });
  if (!["DAMAGED", "INACTIVE"].includes(asset.status)) {
    await tx.asset.update({ where: { id: asset.id }, data: { status: openCount ? "UNDER_MAINTENANCE" : "ACTIVE" } });
  }
  return record;
}, { isolationLevel: "Serializable" });

export const updateMaintenance = async (panchayatId, id, data) => prisma.$transaction(async (tx) => {
  const existing = await tx.maintenanceRecord.findFirst({ where: { id, asset: { is: { scheme: { is: { panchayatId } } } } } });
  if (!existing) return null;
  if (data.assetId) {
    const asset = await tx.asset.findFirst({ where: { id: data.assetId, scheme: { is: { panchayatId } } } });
    if (!asset) throw fail("Selected asset was not found in your Panchayat.", 404);
  }
  const update = { ...data };
  if (data.status === "COMPLETED") update.completedAt = new Date();
  if (data.status && data.status !== "COMPLETED") update.completedAt = null;
  const record = await tx.maintenanceRecord.update({ where: { id }, data: update, include: maintenanceInclude });
  if (data.status || data.assetId) {
    const affectedAssetIds = [...new Set([existing.assetId, record.assetId])];
    for (const assetId of affectedAssetIds) {
      const openCount = await tx.maintenanceRecord.count({ where: { assetId, status: { in: ["REPORTED", "IN_PROGRESS"] } } });
      const asset = await tx.asset.findUnique({ where: { id: assetId }, select: { status: true } });
      if (asset && asset.status !== "DAMAGED" && asset.status !== "INACTIVE") {
        await tx.asset.update({ where: { id: assetId }, data: { status: openCount ? "UNDER_MAINTENANCE" : "ACTIVE" } });
      }
    }
  }
  return record;
}, { isolationLevel: "Serializable" });
export const deleteMaintenance = async (panchayatId, id) => prisma.$transaction(async (tx) => {
  const existing = await tx.maintenanceRecord.findFirst({ where: { id, asset: { is: { scheme: { is: { panchayatId } } } } } });
  if (!existing) return null;
  await tx.maintenanceRecord.delete({ where: { id } });
  const openCount = await tx.maintenanceRecord.count({ where: { assetId: existing.assetId, status: { in: ["REPORTED", "IN_PROGRESS"] } } });
  const asset = await tx.asset.findUnique({ where: { id: existing.assetId }, select: { status: true } });
  if (asset && asset.status === "UNDER_MAINTENANCE" && openCount === 0) {
    await tx.asset.update({ where: { id: existing.assetId }, data: { status: "ACTIVE" } });
  }
  return existing;
}, { isolationLevel: "Serializable" });

// Suppliers and inventory
export const listSuppliers = (panchayatId) => prisma.supplier.findMany({ where: { panchayatId }, orderBy: { name: "asc" } });
export const createSupplier = (panchayatId, data) => prisma.supplier.create({ data: { ...data, panchayatId } });
export const updateSupplier = async (panchayatId, id, data) => {
  const existing = await prisma.supplier.findFirst({ where: { id, panchayatId } });
  return existing ? prisma.supplier.update({ where: { id }, data }) : null;
};
export const deleteSupplier = async (panchayatId, id) => {
  const existing = await prisma.supplier.findFirst({ where: { id, panchayatId }, include: { _count: { select: { stockMovements: true } } } });
  if (!existing) return null;
  if (existing._count.stockMovements) throw fail("This supplier is referenced by stock purchase history and cannot be deleted.", 409);
  return prisma.supplier.delete({ where: { id } });
};
export const listInventory = (panchayatId) => prisma.inventoryItem.findMany({ where: { panchayatId }, include: { _count: { select: { movements: true } } }, orderBy: { name: "asc" } });
export const createInventoryItem = async (panchayatId, userId, data) => prisma.$transaction(async (tx) => {
  const openingQuantity = Number(data.quantity || 0);
  const item = await tx.inventoryItem.create({
    data: { ...data, quantity: 0, panchayatId },
  });
  if (openingQuantity > 0) {
    await tx.stockMovement.create({
      data: {
        itemId: item.id,
        userId,
        type: "ADJUSTMENT",
        quantity: openingQuantity,
        unitCost: data.unitCost,
        notes: "Opening stock at item registration",
      },
    });
    return tx.inventoryItem.update({ where: { id: item.id }, data: { quantity: openingQuantity } });
  }
  return item;
}, { isolationLevel: "Serializable" });
export const updateInventoryItem = async (panchayatId, id, data) => {
  const existing = await prisma.inventoryItem.findFirst({ where: { id, panchayatId } });
  if (!existing) return null;
  const safeData = { ...data };
  delete safeData.quantity; // Stock changes must be recorded as movements.
  return prisma.inventoryItem.update({ where: { id }, data: safeData });
};
export const deleteInventoryItem = async (panchayatId, id) => {
  const existing = await prisma.inventoryItem.findFirst({ where: { id, panchayatId }, include: { _count: { select: { movements: true } } } });
  if (!existing) return null;
  if (existing._count.movements) throw fail("This item has stock movement history and cannot be deleted.", 409);
  return prisma.inventoryItem.delete({ where: { id } });
};
export const listStockMovements = async (panchayatId, itemId) => {
  const item = await prisma.inventoryItem.findFirst({ where: { id: itemId, panchayatId } });
  if (!item) return null;
  return prisma.stockMovement.findMany({ where: { itemId, item: { is: { panchayatId } } }, include: { user: { select: { name: true } }, supplier: { select: { id: true, name: true } } }, orderBy: { createdAt: "desc" } });
};

export const createStockMovement = async (panchayatId, userId, itemId, data) => prisma.$transaction(async (tx) => {
  const item = await tx.inventoryItem.findFirst({ where: { id: itemId, panchayatId } });
  if (!item) throw fail("Inventory item not found.", 404);
  if (data.supplierId) {
    const supplier = await tx.supplier.findFirst({ where: { id: data.supplierId, panchayatId } });
    if (!supplier) throw fail("Selected supplier was not found in your Panchayat.", 404);
  }
  const quantity = Number(data.quantity);
  const delta = data.type === "PURCHASE" ? quantity : data.type === "CONSUMPTION" ? -quantity : quantity;
  const currentQuantity = Number(item.quantity);
  const nextQuantity = currentQuantity + delta;
  if (nextQuantity < 0) throw fail("This movement would make stock negative.", 409);
  const movement = await tx.stockMovement.create({
    data: {
      itemId,
      userId,
      supplierId: data.supplierId || null,
      type: data.type,
      quantity,
      unitCost: data.unitCost,
      reference: data.reference,
      notes: data.notes,
    },
    include: { supplier: { select: { id: true, name: true } }, user: { select: { name: true } } },
  });
  const update = { quantity: nextQuantity };
  if (data.type === "PURCHASE" && data.unitCost != null && nextQuantity > 0) {
    const oldValue = currentQuantity * Number(item.unitCost);
    const purchaseValue = quantity * Number(data.unitCost);
    update.unitCost = Number(((oldValue + purchaseValue) / nextQuantity).toFixed(2));
  }
  const updatedItem = await tx.inventoryItem.update({ where: { id: itemId }, data: update });
  return { movement, item: updatedItem };
}, { isolationLevel: "Serializable" });

// Consumers
const consumerInclude = { village: { select: { id: true, name: true } }, _count: { select: { bills: true } } };
export const listConsumers = (panchayatId) => prisma.consumer.findMany({ where: { panchayatId }, include: consumerInclude, orderBy: { name: "asc" } });
export const createConsumer = async (panchayatId, data) => {
  const village = await prisma.village.findFirst({ where: { id: data.villageId, panchayatId } });
  if (!village) throw fail("Selected village was not found in your Panchayat.", 404);
  return prisma.consumer.create({ data: { ...data, panchayatId }, include: consumerInclude });
};
export const updateConsumer = async (panchayatId, id, data) => {
  const existing = await prisma.consumer.findFirst({ where: { id, panchayatId } });
  if (!existing) return null;
  if (data.villageId) {
    const village = await prisma.village.findFirst({ where: { id: data.villageId, panchayatId } });
    if (!village) throw fail("Selected village was not found in your Panchayat.", 404);
  }
  return prisma.consumer.update({ where: { id }, data, include: consumerInclude });
};
export const deleteConsumer = async (panchayatId, id) => {
  const existing = await prisma.consumer.findFirst({ where: { id, panchayatId }, include: { _count: { select: { bills: true } } } });
  if (!existing) return null;
  if (existing._count.bills) throw fail("This consumer has billing history and cannot be deleted.", 409);
  return prisma.consumer.delete({ where: { id } });
};

// Billing and payments
const billInclude = { consumer: { select: { id: true, consumerNo: true, name: true, phone: true, village: { select: { name: true } } } }, payments: { orderBy: { createdAt: "desc" } } };
export const listBills = async (panchayatId) => {
  const overdue = await prisma.bill.findMany({
    where: { consumer: { is: { panchayatId } }, status: { in: ["PENDING", "PARTIALLY_PAID"] }, dueDate: { lt: new Date() } },
    select: { id: true },
  });
  if (overdue.length) {
    await prisma.bill.updateMany({ where: { id: { in: overdue.map((bill) => bill.id) } }, data: { status: "OVERDUE" } });
  }
  return prisma.bill.findMany({ where: { consumer: { is: { panchayatId } } }, include: billInclude, orderBy: { createdAt: "desc" } });
};
export const createBill = async (panchayatId, data) => {
  const consumer = await prisma.consumer.findFirst({ where: { id: data.consumerId, panchayatId } });
  if (!consumer) throw fail("Consumer not found.", 404);
  const amount = data.amount ?? Number(consumer.monthlyRate);
  if (amount <= 0) throw fail("Set a positive monthly charge for this consumer or provide a custom bill amount.");
  const dueDate = new Date(data.dueDate);
  dueDate.setUTCHours(18, 29, 59, 999); // End of the date in India Standard Time (UTC+05:30).
  return prisma.bill.create({ data: { ...data, dueDate, amount }, include: billInclude });
};
export const deleteBill = async (panchayatId, id) => {
  const bill = await prisma.bill.findFirst({ where: { id, consumer: { is: { panchayatId } } }, include: { _count: { select: { payments: true } } } });
  if (!bill) return null;
  if (bill._count.payments) throw fail("A bill with payment records cannot be deleted.", 409);
  return prisma.bill.delete({ where: { id } });
};
export const recordPayment = async (panchayatId, userId, billId, data) => prisma.$transaction(async (tx) => {
  const bill = await tx.bill.findFirst({ where: { id: billId, consumer: { is: { panchayatId } } }, include: { payments: { where: { status: "SUCCESS" } } } });
  if (!bill) throw fail("Bill not found.", 404);
  const alreadyPaid = bill.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  const outstanding = Number(bill.amount) - alreadyPaid;
  const amount = Number(data.amount);
  if (amount > outstanding + 0.00001) throw fail(`Payment exceeds the outstanding amount of ₹${outstanding.toFixed(2)}.`, 409);
  const payment = await tx.payment.create({ data: { billId, amount, method: data.method, status: "SUCCESS", reference: data.reference, paidAt: new Date() } });
  const totalPaid = alreadyPaid + amount;
  const status = totalPaid >= Number(bill.amount) ? "PAID" : bill.dueDate < new Date() ? "OVERDUE" : "PARTIALLY_PAID";
  await tx.bill.update({ where: { id: billId }, data: { status } });
  await tx.financialEntry.create({ data: { panchayatId, recordedById: userId, type: "RECEIPT", category: "Water bill payment", description: `Payment for bill ${billId}`, amount, source: `PAYMENT:${payment.id}`, paymentId: payment.id, date: new Date() } });
  return { payment, outstanding: Math.max(0, Number(bill.amount) - totalPaid), billStatus: status };
}, { isolationLevel: "Serializable" });

export const reversePayment = async (panchayatId, userId, billId, paymentId, reason) => prisma.$transaction(async (tx) => {
  const payment = await tx.payment.findFirst({
    where: { id: paymentId, billId, status: "SUCCESS", reversedAt: null, bill: { is: { consumer: { is: { panchayatId } } } } },
    include: { bill: true },
  });
  if (!payment) throw fail("Successful payment not found, or it has already been reversed.", 404);

  let receiptEntry = await tx.financialEntry.findFirst({
    where: { panchayatId, paymentId: payment.id },
  });

  // Backfill a unique receipt created by the earlier AquaX release, before
  // FinancialEntry.paymentId was introduced. Ambiguous matches are rejected.
  if (!receiptEntry) {
    const legacySources = [...new Set([payment.reference, payment.id, `PAYMENT:${payment.id}`].filter(Boolean))];
    const legacyMatches = await tx.financialEntry.findMany({
      where: {
        panchayatId,
        type: "RECEIPT",
        category: "Water bill payment",
        description: `Payment for bill ${billId}`,
        amount: payment.amount,
        source: { in: legacySources },
        paymentId: null,
      },
      take: 2,
    });
    if (legacyMatches.length === 1) {
      receiptEntry = await tx.financialEntry.update({
        where: { id: legacyMatches[0].id },
        data: { paymentId: payment.id },
      });
    }
  }
  if (!receiptEntry) throw fail("The linked cash-book receipt could not be identified safely. Contact the system administrator before changing this payment.", 409);

  const reversal = await tx.financialEntry.create({
    data: {
      panchayatId,
      recordedById: userId,
      type: "EXPENSE",
      category: "Bill payment reversal",
      description: `Reversal of payment ${payment.id}. Reason: ${reason}`,
      amount: payment.amount,
      source: `PAYMENT_REVERSAL:${payment.id}`,
      reversalOfId: receiptEntry.id,
      date: new Date(),
    },
  });
  await tx.payment.update({
    where: { id: payment.id },
    data: { status: "REVERSED", reversedAt: new Date(), reversedReason: reason },
  });

  const successfulPayments = await tx.payment.findMany({
    where: { billId, status: "SUCCESS", reversedAt: null },
    select: { amount: true },
  });
  const totalPaid = successfulPayments.reduce((sum, item) => sum + Number(item.amount), 0);
  const billStatus = totalPaid >= Number(payment.bill.amount)
    ? "PAID"
    : payment.bill.dueDate < new Date()
      ? "OVERDUE"
      : totalPaid > 0 ? "PARTIALLY_PAID" : "PENDING";
  await tx.bill.update({ where: { id: billId }, data: { status: billStatus } });

  return { paymentId: payment.id, reversalId: reversal.id, billStatus, totalPaid, outstanding: Math.max(0, Number(payment.bill.amount) - totalPaid) };
}, { isolationLevel: "Serializable" });

// Finance
export const listFinanceEntries = (panchayatId) => prisma.financialEntry.findMany({ where: { panchayatId }, include: { recordedBy: { select: { name: true } }, reversalOf: { select: { id: true } }, reversedBy: { select: { id: true } } }, orderBy: { date: "desc" } });
export const createFinanceEntry = (panchayatId, userId, data) => prisma.financialEntry.create({ data: { ...data, panchayatId, recordedById: userId } });
export const updateFinanceEntry = async (panchayatId, id) => {
  const entry = await prisma.financialEntry.findFirst({ where: { id, panchayatId }, select: { id: true } });
  if (!entry) return null;
  throw fail("Cash-book entries are immutable after posting. Record a linked reversal and a corrected entry instead.", 409);
};
export const deleteFinanceEntry = async (panchayatId, id) => {
  const entry = await prisma.financialEntry.findFirst({ where: { id, panchayatId }, select: { id: true } });
  if (!entry) return null;
  throw fail("Cash-book entries cannot be deleted. Record a linked reversal instead.", 409);
};

export const reverseFinanceEntry = async (panchayatId, userId, id, reason) => prisma.$transaction(async (tx) => {
  const entry = await tx.financialEntry.findFirst({ where: { id, panchayatId } });
  if (!entry) return null;
  if (entry.reversalOfId) throw fail("A reversal entry cannot itself be reversed.", 409);
  if (entry.category === "Water bill payment") throw fail("Bill payment receipts must be corrected through the billing workflow.", 409);
  const priorReversal = await tx.financialEntry.findFirst({ where: { reversalOfId: entry.id }, select: { id: true } });
  if (priorReversal) throw fail("This entry has already been reversed.", 409);
  const reversal = await tx.financialEntry.create({
    data: {
      panchayatId,
      recordedById: userId,
      type: entry.type === "RECEIPT" ? "EXPENSE" : "RECEIPT",
      category: `Reversal: ${entry.category}`.slice(0, 100),
      description: `Reversal of ${entry.id}. Reason: ${reason}`,
      amount: entry.amount,
      source: `REVERSAL:${entry.id}`,
      reversalOfId: entry.id,
      date: new Date(),
    },
    include: { recordedBy: { select: { name: true } }, reversalOf: { select: { id: true } } },
  });
  return reversal;
}, { isolationLevel: "Serializable" });

// Dashboard and reporting aggregates
export const getDashboardSummary = async (panchayatId) => {
  ensurePanchayat(panchayatId);
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const [villages, schemes, consumers, assets, openMaintenance, monthlyCollection, pendingBills, recentMaintenance, recentConsumers] = await Promise.all([
    prisma.village.count({ where: { panchayatId } }),
    prisma.scheme.count({ where: { panchayatId } }),
    prisma.consumer.count({ where: { panchayatId } }),
    prisma.asset.count({ where: { scheme: { is: { panchayatId } } } }),
    prisma.maintenanceRecord.count({ where: { asset: { is: { scheme: { is: { panchayatId } } } }, status: { in: ["REPORTED", "IN_PROGRESS"] } } }),
    prisma.payment.aggregate({ where: { status: "SUCCESS", paidAt: { gte: monthStart }, bill: { is: { consumer: { is: { panchayatId } } } } }, _sum: { amount: true } }),
    prisma.bill.count({ where: { consumer: { is: { panchayatId } }, status: { in: ["PENDING", "PARTIALLY_PAID", "OVERDUE"] } } }),
    prisma.maintenanceRecord.findMany({ where: { asset: { is: { scheme: { is: { panchayatId } } } } }, include: { asset: { select: { name: true } } }, orderBy: { reportedAt: "desc" }, take: 5 }),
    prisma.consumer.findMany({ where: { panchayatId }, include: { village: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 5 }),
  ]);
  const stockRows = await prisma.inventoryItem.findMany({ where: { panchayatId }, select: { quantity: true, reorderLevel: true } });
  const lowStock = stockRows.filter((item) => item.quantity <= item.reorderLevel).length;
  const assetTypes = await prisma.asset.findMany({ where: { scheme: { is: { panchayatId } } }, select: { type: true } });
  const distributionMap = assetTypes.reduce((map, asset) => {
    const label = asset.type.replaceAll("_", " ");
    map.set(label, (map.get(label) || 0) + 1);
    return map;
  }, new Map());
  const distribution = [...distributionMap].map(([name, count]) => ({ name, count }));
  const sixMonthsAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));
  const payments = await prisma.payment.findMany({ where: { status: "SUCCESS", paidAt: { gte: sixMonthsAgo }, bill: { is: { consumer: { is: { panchayatId } } } } }, select: { amount: true, paidAt: true } });
  const monthlyRevenue = Array.from({ length: 6 }, (_, index) => {
    const month = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5 + index, 1));
    const revenue = payments.filter((payment) => payment.paidAt && payment.paidAt.getUTCFullYear() === month.getUTCFullYear() && payment.paidAt.getUTCMonth() === month.getUTCMonth()).reduce((sum, payment) => sum + Number(payment.amount), 0);
    return { month: month.toLocaleString("en-IN", { month: "short", timeZone: "UTC" }), revenue: Number(revenue.toFixed(2)) };
  });
  return {
    stats: { villages, schemes, consumers, assets, openMaintenance, monthlyCollection: Number(monthlyCollection._sum.amount || 0), lowStock, pendingBills },
    assetDistribution: distribution,
    monthlyRevenue,
    maintenance: recentMaintenance,
    recentConsumers,
  };
};

export const getReportSummary = async (panchayatId, from, to) => {
  ensurePanchayat(panchayatId);
  const { start, end } = reportDateRange(from, to);
  const [receipts, expenses, consumers, villages, assets, bills, maintenance, inventory] = await Promise.all([
    prisma.financialEntry.aggregate({ where: { panchayatId, type: "RECEIPT", date: { gte: start, lte: end } }, _sum: { amount: true }, _count: { _all: true } }),
    prisma.financialEntry.aggregate({ where: { panchayatId, type: "EXPENSE", date: { gte: start, lte: end } }, _sum: { amount: true }, _count: { _all: true } }),
    prisma.consumer.count({ where: { panchayatId } }),
    prisma.village.count({ where: { panchayatId } }),
    prisma.asset.findMany({ where: { scheme: { is: { panchayatId } } }, select: { type: true, status: true } }),
    prisma.bill.findMany({ where: { consumer: { is: { panchayatId } } }, select: { status: true, amount: true } }),
    prisma.maintenanceRecord.count({ where: { asset: { is: { scheme: { is: { panchayatId } } } }, reportedAt: { gte: start, lte: end } } }),
    prisma.inventoryItem.findMany({ where: { panchayatId }, select: { name: true, quantity: true, reorderLevel: true, unit: true } }),
  ]);
  return {
    period: { from: start, to: end },
    finance: { receipts: Number(receipts._sum.amount || 0), expenses: Number(expenses._sum.amount || 0), net: Number(receipts._sum.amount || 0) - Number(expenses._sum.amount || 0), receiptCount: receipts._count._all, expenseCount: expenses._count._all },
    operations: { consumers, villages, maintenanceReported: maintenance },
    assets: [...assets.reduce((map, row) => {
      const key = `${row.type}::${row.status}`;
      map.set(key, { type: row.type, status: row.status, count: (map.get(key)?.count || 0) + 1 });
      return map;
    }, new Map()).values()],
    bills: [...bills.reduce((map, row) => {
      const current = map.get(row.status) || { status: row.status, count: 0, amount: 0 };
      current.count += 1;
      current.amount += Number(row.amount);
      map.set(row.status, current);
      return map;
    }, new Map()).values()],
    lowStock: inventory.filter((item) => item.quantity <= item.reorderLevel),
  };
};

export const getReportTransactions = (panchayatId, from, to) => {
  const { start, end } = reportDateRange(from, to);
  return prisma.financialEntry.findMany({ where: { panchayatId, date: { gte: start, lte: end } }, orderBy: { date: "desc" } });
};
