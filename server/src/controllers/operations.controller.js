import * as service from "../services/operations.service.js";

const endpoint = (work, { status = 200, message, notFound = false } = {}) => async (req, res, next) => {
  try {
    const data = await work(req);
    if (notFound && data == null) {
      return res.status(404).json({ success: false, message: "Record not found." });
    }
    return res.status(status).json({ success: true, ...(message ? { message } : {}), data });
  } catch (error) {
    return next(error);
  }
};
const tenant = (req) => req.user.panchayatId;

export const listSchemes = endpoint((req) => service.listSchemes(tenant(req)));
export const createScheme = endpoint((req) => service.createScheme(tenant(req), req.body), { status: 201, message: "Scheme created." });
export const updateScheme = endpoint((req) => service.updateScheme(tenant(req), req.params.id, req.body), { notFound: true, message: "Scheme updated." });
export const deleteScheme = endpoint((req) => service.deleteScheme(tenant(req), req.params.id), { notFound: true, message: "Scheme deleted." });

export const listAssets = endpoint((req) => service.listAssets(tenant(req)));
export const createAsset = endpoint((req) => service.createAsset(tenant(req), req.body), { status: 201, message: "Asset created." });
export const updateAsset = endpoint((req) => service.updateAsset(tenant(req), req.params.id, req.body), { notFound: true, message: "Asset updated." });
export const deleteAsset = endpoint((req) => service.deleteAsset(tenant(req), req.params.id), { notFound: true, message: "Asset deleted." });

export const listMaintenance = endpoint((req) => service.listMaintenance(tenant(req)));
export const createMaintenance = endpoint((req) => service.createMaintenance(tenant(req), req.user.id, req.body), { status: 201, message: "Maintenance record created." });
export const updateMaintenance = endpoint((req) => service.updateMaintenance(tenant(req), req.params.id, req.body), { notFound: true, message: "Maintenance record updated." });
export const deleteMaintenance = endpoint((req) => service.deleteMaintenance(tenant(req), req.params.id), { notFound: true, message: "Maintenance record deleted." });

export const listSuppliers = endpoint((req) => service.listSuppliers(tenant(req)));
export const createSupplier = endpoint((req) => service.createSupplier(tenant(req), req.body), { status: 201, message: "Supplier created." });
export const updateSupplier = endpoint((req) => service.updateSupplier(tenant(req), req.params.id, req.body), { notFound: true, message: "Supplier updated." });
export const deleteSupplier = endpoint((req) => service.deleteSupplier(tenant(req), req.params.id), { notFound: true, message: "Supplier deleted." });

export const listInventory = endpoint((req) => service.listInventory(tenant(req)));
export const createInventoryItem = endpoint((req) => service.createInventoryItem(tenant(req), req.user.id, req.body), { status: 201, message: "Inventory item created." });
export const updateInventoryItem = endpoint((req) => service.updateInventoryItem(tenant(req), req.params.id, req.body), { notFound: true, message: "Inventory item updated." });
export const deleteInventoryItem = endpoint((req) => service.deleteInventoryItem(tenant(req), req.params.id), { notFound: true, message: "Inventory item deleted." });
export const listStockMovements = endpoint((req) => service.listStockMovements(tenant(req), req.params.id), { notFound: true });
export const createStockMovement = endpoint((req) => service.createStockMovement(tenant(req), req.user.id, req.params.id, req.body), { status: 201, message: "Stock movement recorded." });

export const listConsumers = endpoint((req) => service.listConsumers(tenant(req)));
export const createConsumer = endpoint((req) => service.createConsumer(tenant(req), req.body), { status: 201, message: "Consumer created." });
export const updateConsumer = endpoint((req) => service.updateConsumer(tenant(req), req.params.id, req.body), { notFound: true, message: "Consumer updated." });
export const deleteConsumer = endpoint((req) => service.deleteConsumer(tenant(req), req.params.id), { notFound: true, message: "Consumer deleted." });

export const listBills = endpoint((req) => service.listBills(tenant(req)));
export const createBill = endpoint((req) => service.createBill(tenant(req), req.body), { status: 201, message: "Bill generated." });
export const deleteBill = endpoint((req) => service.deleteBill(tenant(req), req.params.id), { notFound: true, message: "Bill deleted." });
export const recordPayment = endpoint((req) => service.recordPayment(tenant(req), req.user.id, req.params.id, req.body), { status: 201, message: "Payment recorded." });
export const reversePayment = endpoint((req) => service.reversePayment(tenant(req), req.user.id, req.params.id, req.params.paymentId, req.body.reason), { status: 201, notFound: true, message: "Payment reversed." });

export const listFinanceEntries = endpoint((req) => service.listFinanceEntries(tenant(req)));
export const createFinanceEntry = endpoint((req) => service.createFinanceEntry(tenant(req), req.user.id, req.body), { status: 201, message: "Financial entry recorded." });
export const updateFinanceEntry = endpoint((req) => service.updateFinanceEntry(tenant(req), req.params.id, req.body), { notFound: true, message: "Financial entry updated." });
export const deleteFinanceEntry = endpoint((req) => service.deleteFinanceEntry(tenant(req), req.params.id), { notFound: true, message: "Financial entry deleted." });
export const reverseFinanceEntry = endpoint((req) => service.reverseFinanceEntry(tenant(req), req.user.id, req.params.id, req.body.reason), { status: 201, notFound: true, message: "Financial entry reversed." });

export const dashboardSummary = endpoint((req) => service.getDashboardSummary(tenant(req)));
export const reportSummary = endpoint((req) => service.getReportSummary(tenant(req), req.query.from, req.query.to));
export const reportTransactions = endpoint((req) => service.getReportTransactions(tenant(req), req.query.from, req.query.to));
