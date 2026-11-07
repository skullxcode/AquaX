import { z } from "zod";

const optionalText = (max = 500) => z.string().trim().max(max).optional().nullable();
const decimalMoney = z.coerce.number()
  .finite()
  .min(0)
  .max(9_999_999_999.99)
  .refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-7, "Use no more than two decimal places.");
const money = decimalMoney.refine((value) => value > 0, "Amount must be greater than zero.");
const quantity = z.coerce.number().finite().positive();
const date = z.coerce.date();
const nullableDate = z.preprocess(
  (value) => value === "" || value === null ? null : value,
  z.coerce.date().nullable().optional(),
);
const nullableNumber = (min, max) => z.preprocess(
  (value) => value === "" || value === null ? null : value,
  z.coerce.number().finite().min(min).max(max).nullable().optional(),
);

export const schemeSchema = z.object({
  name: z.string().trim().min(2).max(150),
  description: optionalText(2000),
  villageId: z.string().uuid(),
});
export const assetSchema = z.object({
  name: z.string().trim().min(2).max(150),
  type: z.enum(["PUMP", "PIPELINE", "VALVE", "TANK", "TREATMENT_PLANT", "OTHER"]),
  status: z.enum(["ACTIVE", "INACTIVE", "UNDER_MAINTENANCE", "DAMAGED"]).optional(),
  description: optionalText(2000),
  latitude: nullableNumber(-90, 90),
  longitude: nullableNumber(-180, 180),
  installationDate: nullableDate,
  schemeId: z.string().uuid(),
});
export const maintenanceSchema = z.object({
  assetId: z.string().uuid(),
  title: z.string().trim().min(2).max(150),
  description: optionalText(2000),
  status: z.enum(["REPORTED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
  cost: decimalMoney.optional(),
});
export const inventorySchema = z.object({
  name: z.string().trim().min(2).max(150),
  category: z.string().trim().min(2).max(100),
  unit: z.string().trim().min(1).max(30),
  quantity: z.coerce.number().finite().min(0).optional(),
  reorderLevel: z.coerce.number().finite().min(0),
  unitCost: decimalMoney,
});
export const supplierSchema = z.object({
  name: z.string().trim().min(2).max(150),
  phone: optionalText(30),
  address: optionalText(500),
});
export const stockMovementSchema = z.object({
  type: z.enum(["PURCHASE", "CONSUMPTION", "ADJUSTMENT"]),
  quantity: z.coerce.number().finite().refine((value) => value !== 0, "Quantity cannot be zero."),
  unitCost: decimalMoney.optional().nullable(),
  reference: optionalText(100),
  notes: optionalText(500),
  supplierId: z.string().uuid().optional().nullable(),
}).superRefine((value, context) => {
  if (value.type !== "ADJUSTMENT" && value.quantity <= 0) {
    context.addIssue({ code: "custom", path: ["quantity"], message: "Purchase and consumption quantities must be positive." });
  }
  if (value.type === "PURCHASE" && !value.supplierId) {
    context.addIssue({ code: "custom", path: ["supplierId"], message: "Select the supplier for a purchase movement." });
  }
  if (value.type !== "PURCHASE" && value.supplierId) {
    context.addIssue({ code: "custom", path: ["supplierId"], message: "A supplier can only be attached to a purchase movement." });
  }
});
export const consumerSchema = z.object({
  consumerNo: z.string().trim().min(2).max(50),
  name: z.string().trim().min(2).max(150),
  phone: optionalText(30),
  address: optionalText(500),
  connectionDate: nullableDate,
  monthlyRate: decimalMoney,
  status: z.enum(["ACTIVE", "INACTIVE", "DISCONNECTED"]).optional(),
  villageId: z.string().uuid(),
});
export const billSchema = z.object({
  consumerId: z.string().uuid(),
  periodStart: date,
  periodEnd: date,
  dueDate: date,
  amount: money.optional(),
}).superRefine((value, context) => {
  if (value.periodEnd < value.periodStart) {
    context.addIssue({ code: "custom", path: ["periodEnd"], message: "Period end must be on or after period start." });
  }
  if (value.dueDate < value.periodEnd) {
    context.addIssue({ code: "custom", path: ["dueDate"], message: "Due date must be on or after the billing period end." });
  }
});
export const paymentSchema = z.object({
  amount: money,
  method: z.enum(["CASH", "UPI", "NET_BANKING", "CREDIT_CARD", "DEBIT_CARD", "OTHER"]),
  reference: optionalText(100),
});
export const financeSchema = z.object({
  type: z.enum(["RECEIPT", "EXPENSE"]),
  category: z.string().trim().min(2).max(100),
  description: optionalText(1000),
  amount: money,
  source: optionalText(150),
  date: z.preprocess((value) => value === "" || value === null ? undefined : value, date.optional()),
});

export const financeReversalSchema = z.object({
  reason: z.string().trim().min(10).max(500),
});

export const paymentReversalSchema = z.object({
  reason: z.string().trim().min(10).max(500),
});
