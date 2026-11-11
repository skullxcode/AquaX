import { toDateInputValue } from "@/utils/date";

const adminRoles = ["SUPER_ADMIN", "PANCHAYAT_ADMIN"];
const staffRoles = [...adminRoles, "OPERATOR"];

const formatDate = (value) => value ? new Date(value).toLocaleDateString("en-IN") : "—";
const rupees = (value) => value == null ? "—" : `₹${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export const schemeConfig = {
  title: "Scheme Management", singular: "Scheme", endpoint: "/schemes", createRoles: adminRoles, editRoles: adminRoles, deleteRoles: adminRoles, canDeleteRow: (row) => !row._count?.assets,
  description: "Register and manage water supply schemes across your villages.",
  fields: [
    { name: "name", label: "Scheme name", placeholder: "e.g. Jal Jeevan Mission - Rampur" },
    { name: "villageId", label: "Village", type: "select", optionsEndpoint: "/villages" },
    { name: "description", label: "Description", type: "textarea", required: false, span: true },
  ],
  columns: [
    { key: "name", label: "Scheme" },
    { key: "village.name", label: "Village" },
    { key: "_count.assets", label: "Assets", format: (value) => value ?? 0 },
    { key: "createdAt", label: "Created", format: formatDate },
  ],
};

export const assetConfig = {
  title: "Asset Management", singular: "Asset", endpoint: "/assets", createRoles: adminRoles, editRoles: adminRoles, deleteRoles: adminRoles, canDeleteRow: (row) => !row._count?.maintenance,
  description: "Maintain an inventory of pumps, pipelines, valves, tanks and treatment plants.",
  fields: [
    { name: "name", label: "Asset name", placeholder: "e.g. Main water pump" },
    { name: "type", label: "Asset type", type: "select", options: ["PUMP", "PIPELINE", "VALVE", "TANK", "TREATMENT_PLANT", "OTHER"].map((value) => ({ value, label: value.replaceAll("_", " ") })) },
    { name: "schemeId", label: "Scheme", type: "select", optionsEndpoint: "/schemes" },
    { name: "status", label: "Status", type: "select", options: ["ACTIVE", "INACTIVE", "UNDER_MAINTENANCE", "DAMAGED"].map((value) => ({ value, label: value.replaceAll("_", " ") })) },
    { name: "installationDate", label: "Installation date", type: "date", required: false },
    { name: "latitude", label: "Latitude", type: "number", required: false, min: -90, max: 90, step: "any" },
    { name: "longitude", label: "Longitude", type: "number", required: false, min: -180, max: 180, step: "any" },
    { name: "description", label: "Description", type: "textarea", required: false, span: true },
  ],
  columns: [
    { key: "name", label: "Asset" },
    { key: "type", label: "Type", format: (value) => value?.replaceAll("_", " ") },
    { key: "scheme.name", label: "Scheme" },
    { key: "scheme.village.name", label: "Village" },
    { key: "status", label: "Status", badge: true, format: (value) => value?.replaceAll("_", " ") },
  ],
};

export const maintenanceConfig = {
  title: "Maintenance", singular: "Maintenance record", endpoint: "/maintenance", createRoles: staffRoles, editRoles: staffRoles, deleteRoles: adminRoles,
  description: "Report infrastructure faults and track maintenance work through completion.",
  fields: [
    { name: "assetId", label: "Asset", type: "select", optionsEndpoint: "/assets" },
    { name: "title", label: "Issue / task title" },
    { name: "status", label: "Status", type: "select", options: ["REPORTED", "IN_PROGRESS", "COMPLETED", "CANCELLED"].map((value) => ({ value, label: value.replaceAll("_", " ") })) },
    { name: "cost", label: "Maintenance cost (₹)", type: "number", min: 0, step: "0.01", defaultValue: "0" },
    { name: "description", label: "Description", type: "textarea", required: false, span: true },
  ],
  columns: [
    { key: "title", label: "Task" },
    { key: "asset.name", label: "Asset" },
    { key: "status", label: "Status", badge: true, format: (value) => value?.replaceAll("_", " ") },
    { key: "cost", label: "Cost", format: rupees },
    { key: "reportedAt", label: "Reported", format: formatDate },
  ],
};

export const inventoryConfig = {
  title: "Inventory", singular: "Inventory item", endpoint: "/inventory", createRoles: adminRoles, editRoles: adminRoles, deleteRoles: adminRoles, canDeleteRow: (row) => !row._count?.movements,
  description: "Track spare parts, consumables and reorder thresholds. Use stock movements to change quantities.",
  fields: [
    { name: "name", label: "Item name" },
    { name: "category", label: "Category", placeholder: "Pipes, electrical, chemicals..." },
    { name: "unit", label: "Unit", placeholder: "pieces, metres, litres..." },
    { name: "quantity", label: "Opening quantity", type: "number", min: 0, step: "any", defaultValue: "0", createOnly: true },
    { name: "reorderLevel", label: "Reorder level", type: "number", min: 0, step: "any", defaultValue: "0" },
    { name: "unitCost", label: "Unit cost (₹)", type: "number", min: 0, step: "0.01", defaultValue: "0" },
  ],
  columns: [
    { key: "name", label: "Item" },
    { key: "category", label: "Category" },
    { key: "quantity", label: "Available", format: (value, row) => `${value} ${row.unit}` },
    { key: "reorderLevel", label: "Reorder at" },
    { key: "unitCost", label: "Unit cost", format: rupees },
    { key: "stockStatus", label: "Stock status", value: (row) => row.quantity, badge: true, badgeVariant: (value, row) => value <= row.reorderLevel ? "destructive" : "secondary", format: (value, row) => value <= row.reorderLevel ? "LOW STOCK" : "IN STOCK" },
  ],
};

export const supplierConfig = {
  title: "Suppliers", singular: "Supplier", endpoint: "/suppliers", createRoles: adminRoles, editRoles: adminRoles, deleteRoles: adminRoles,
  description: "Maintain contact details for vendors supplying materials and equipment.",
  fields: [
    { name: "name", label: "Supplier name" },
    { name: "phone", label: "Phone number", type: "tel", required: false },
    { name: "address", label: "Address", type: "textarea", required: false, span: true },
  ],
  columns: [
    { key: "name", label: "Supplier" },
    { key: "phone", label: "Phone" },
    { key: "address", label: "Address" },
    { key: "createdAt", label: "Added", format: formatDate },
  ],
};

export const consumerConfig = {
  title: "Consumer Management", singular: "Consumer", endpoint: "/consumers", createRoles: adminRoles, editRoles: adminRoles, deleteRoles: adminRoles, canDeleteRow: (row) => !row._count?.bills,
  description: "Register household connections and maintain consumer account details.",
  fields: [
    { name: "consumerNo", label: "Consumer number", placeholder: "e.g. CON-0001" },
    { name: "name", label: "Consumer name" },
    { name: "villageId", label: "Village", type: "select", optionsEndpoint: "/villages" },
    { name: "phone", label: "Phone number", type: "tel", required: false },
    { name: "monthlyRate", label: "Monthly charge (₹)", type: "number", min: 0, step: "0.01", defaultValue: "0" },
    { name: "status", label: "Connection status", type: "select", options: ["ACTIVE", "INACTIVE", "DISCONNECTED"].map((value) => ({ value, label: value })) },
    { name: "connectionDate", label: "Connection date", type: "date", required: false },
    { name: "address", label: "Address", type: "textarea", required: false, span: true },
  ],
  columns: [
    { key: "consumerNo", label: "Consumer ID" },
    { key: "name", label: "Name" },
    { key: "village.name", label: "Village" },
    { key: "phone", label: "Phone" },
    { key: "monthlyRate", label: "Monthly rate", format: rupees },
    { key: "status", label: "Status", badge: true },
  ],
};

export const financeConfig = {
  title: "Finance & Cash Book", singular: "Financial entry", endpoint: "/finance", createRoles: staffRoles, editRoles: [], deleteRoles: [],
  description: "Record Panchayat receipts and expenses. Successful bill payments are added as receipts automatically.",
  fields: [
    { name: "type", label: "Entry type", type: "select", options: [{ value: "RECEIPT", label: "Receipt / Income" }, { value: "EXPENSE", label: "Expense" }] },
    { name: "category", label: "Category", placeholder: "Water charges, repair, salaries..." },
    { name: "amount", label: "Amount (₹)", type: "number", min: 0.01, step: "0.01" },
    { name: "date", label: "Transaction date", type: "date", defaultValue: toDateInputValue() },
    { name: "source", label: "Source / reference", required: false },
    { name: "description", label: "Description", type: "textarea", required: false, span: true },
  ],
  canEditRow: (row) => row.category !== "Water bill payment" && !row.reversalOfId && !row.reversedBy,
  canDeleteRow: (row) => row.category !== "Water bill payment" && !row.reversalOfId && !row.reversedBy,
  columns: [
    { key: "date", label: "Date", format: formatDate },
    { key: "type", label: "Type", badge: true, format: (value) => value },
    { key: "category", label: "Category" },
    { key: "description", label: "Description" },
    { key: "amount", label: "Amount", format: rupees },
    { key: "source", label: "Reference" },
    { key: "recordedBy.name", label: "Recorded by" },
  ],
};
