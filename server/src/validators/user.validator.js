import { z } from "zod";

const password = z.string().min(8).refine((value) => Buffer.byteLength(value, "utf8") <= 72, "Password must not exceed 72 UTF-8 bytes.");

export const createManagedUserSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().toLowerCase(),
  password,
  role: z.enum(["OPERATOR", "PANCHAYAT_ADMIN"]).default("OPERATOR"),
});

export const updateManagedUserSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  email: z.string().trim().email().toLowerCase().optional(),
  password: password.optional(),
  role: z.enum(["OPERATOR", "PANCHAYAT_ADMIN"]).optional(),
  isActive: z.boolean().optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: "Provide at least one field to update.",
});
