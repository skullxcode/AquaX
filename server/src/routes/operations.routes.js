import { Router } from "express";
import { protect } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";
import { validate } from "../validators/auth.validator.js";
import {
  schemeSchema, assetSchema, maintenanceSchema, inventorySchema, supplierSchema,
  stockMovementSchema, consumerSchema, billSchema, paymentSchema, financeSchema, financeReversalSchema, paymentReversalSchema,
} from "../validators/operations.validator.js";
import * as controller from "../controllers/operations.controller.js";

const router = Router();
const admin = authorize("SUPER_ADMIN", "PANCHAYAT_ADMIN");
const staff = authorize("SUPER_ADMIN", "PANCHAYAT_ADMIN", "OPERATOR");
router.use(protect, (req, res, next) => {
  if (!req.user.panchayatId) return res.status(403).json({ success: false, message: "A Panchayat account is required." });
  next();
});

router.get("/dashboard/summary", controller.dashboardSummary);
router.get("/reports/summary", controller.reportSummary);
router.get("/reports/transactions", controller.reportTransactions);

router.get("/schemes", controller.listSchemes);
router.post("/schemes", admin, validate(schemeSchema), controller.createScheme);
router.patch("/schemes/:id", admin, validate(schemeSchema.partial()), controller.updateScheme);
router.delete("/schemes/:id", admin, controller.deleteScheme);

router.get("/assets", controller.listAssets);
router.post("/assets", admin, validate(assetSchema), controller.createAsset);
router.patch("/assets/:id", admin, validate(assetSchema.partial()), controller.updateAsset);
router.delete("/assets/:id", admin, controller.deleteAsset);

router.get("/maintenance", controller.listMaintenance);
router.post("/maintenance", staff, validate(maintenanceSchema), controller.createMaintenance);
router.patch("/maintenance/:id", staff, validate(maintenanceSchema.partial()), controller.updateMaintenance);
router.delete("/maintenance/:id", admin, controller.deleteMaintenance);

router.get("/suppliers", controller.listSuppliers);
router.post("/suppliers", admin, validate(supplierSchema), controller.createSupplier);
router.patch("/suppliers/:id", admin, validate(supplierSchema.partial()), controller.updateSupplier);
router.delete("/suppliers/:id", admin, controller.deleteSupplier);

router.get("/inventory", controller.listInventory);
router.post("/inventory", admin, validate(inventorySchema), controller.createInventoryItem);
router.patch("/inventory/:id", admin, validate(inventorySchema.partial()), controller.updateInventoryItem);
router.delete("/inventory/:id", admin, controller.deleteInventoryItem);
router.get("/inventory/:id/movements", controller.listStockMovements);
router.post("/inventory/:id/movements", staff, validate(stockMovementSchema), controller.createStockMovement);

router.get("/consumers", controller.listConsumers);
router.post("/consumers", admin, validate(consumerSchema), controller.createConsumer);
router.patch("/consumers/:id", admin, validate(consumerSchema.partial()), controller.updateConsumer);
router.delete("/consumers/:id", admin, controller.deleteConsumer);

router.get("/bills", controller.listBills);
router.post("/bills", admin, validate(billSchema), controller.createBill);
router.delete("/bills/:id", admin, controller.deleteBill);
router.post("/bills/:id/payments", staff, validate(paymentSchema), controller.recordPayment);
router.post("/bills/:id/payments/:paymentId/reverse", admin, validate(paymentReversalSchema), controller.reversePayment);

router.get("/finance", controller.listFinanceEntries);
router.post("/finance", staff, validate(financeSchema), controller.createFinanceEntry);
router.patch("/finance/:id", admin, validate(financeSchema.partial()), controller.updateFinanceEntry);
router.delete("/finance/:id", admin, controller.deleteFinanceEntry);
router.post("/finance/:id/reverse", admin, validate(financeReversalSchema), controller.reverseFinanceEntry);

export default router;
