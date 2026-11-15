import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  assetSchema,
  billSchema,
  financeSchema,
  paymentSchema,
  financeReversalSchema,
  paymentReversalSchema,
  stockMovementSchema,
} from "../src/validators/operations.validator.js";
import {
  createManagedUserSchema,
  updateManagedUserSchema,
} from "../src/validators/user.validator.js";

const id = () => randomUUID();

test("asset coordinates accept valid optional values", () => {
  const result = assetSchema.safeParse({
    name: "Rampur pump",
    type: "PUMP",
    schemeId: id(),
    latitude: 23.25,
    longitude: 77.41,
  });
  assert.equal(result.success, true);
});

test("asset coordinates reject values outside geographic ranges", () => {
  const result = assetSchema.safeParse({
    name: "Rampur pump",
    type: "PUMP",
    schemeId: id(),
    latitude: 120,
    longitude: 77.41,
  });
  assert.equal(result.success, false);
});

test("purchase movement requires a Panchayat supplier", () => {
  const result = stockMovementSchema.safeParse({ type: "PURCHASE", quantity: 10 });
  assert.equal(result.success, false);
});

test("supplier-linked stock purchase is valid", () => {
  const result = stockMovementSchema.safeParse({
    type: "PURCHASE",
    quantity: 10,
    supplierId: id(),
    unitCost: 12.5,
  });
  assert.equal(result.success, true);
});

test("consumption quantity must be positive", () => {
  const result = stockMovementSchema.safeParse({ type: "CONSUMPTION", quantity: -3 });
  assert.equal(result.success, false);
});

test("bill period cannot end before it starts or have an earlier due date", () => {
  const invalidPeriod = billSchema.safeParse({
    consumerId: id(),
    periodStart: "2026-04-30",
    periodEnd: "2026-04-01",
    dueDate: "2026-05-10",
  });
  const invalidDueDate = billSchema.safeParse({
    consumerId: id(),
    periodStart: "2026-04-01",
    periodEnd: "2026-04-30",
    dueDate: "2026-04-15",
  });
  assert.equal(invalidPeriod.success, false);
  assert.equal(invalidDueDate.success, false);
});

test("finance reversal requires an explanatory reason", () => {
  assert.equal(financeReversalSchema.safeParse({ reason: "wrong" }).success, false);
  assert.equal(financeReversalSchema.safeParse({ reason: "Incorrect amount entered" }).success, true);
  assert.equal(paymentReversalSchema.safeParse({ reason: "Wrong bill selected" }).success, true);
});

test("managed user requires a valid email and strong password", () => {
  assert.equal(createManagedUserSchema.safeParse({ name: "Operator One", email: "not-email", password: "123", role: "OPERATOR" }).success, false);
  assert.equal(createManagedUserSchema.safeParse({ name: "Operator One", email: "operator@example.org", password: "strong-password", role: "OPERATOR" }).success, true);
});

test("managed user update rejects an empty update", () => {
  assert.equal(updateManagedUserSchema.safeParse({}).success, false);
  assert.equal(updateManagedUserSchema.safeParse({ isActive: false }).success, true);
});


test("monetary values are positive, finite, within database precision and limited to two decimals", () => {
  assert.equal(paymentSchema.safeParse({ amount: 10.25, method: "CASH" }).success, true);
  assert.equal(paymentSchema.safeParse({ amount: 10.257, method: "CASH" }).success, false);
  assert.equal(paymentSchema.safeParse({ amount: Number.POSITIVE_INFINITY, method: "CASH" }).success, false);
  assert.equal(financeSchema.safeParse({ type: "EXPENSE", category: "Repairs", amount: 0 }).success, false);
});

test("asset form accepts blank optional coordinates and installation dates", () => {
  const result = assetSchema.safeParse({
    name: "Rampur pump",
    type: "PUMP",
    schemeId: id(),
    latitude: "",
    longitude: "",
    installationDate: "",
  });
  assert.equal(result.success, true);
  assert.equal(result.data.latitude, null);
  assert.equal(result.data.longitude, null);
  assert.equal(result.data.installationDate, null);
});
