
import { z } from "zod";

const passwordSchema = z.string().min(8).refine((value) => Buffer.byteLength(value, "utf8") <= 72, "Password must not exceed 72 UTF-8 bytes.");

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),

  email: z.string().trim().email().toLowerCase(),

  password: passwordSchema,

  panchayatName: z.string().trim().min(2).max(150),

  panchayatCode: z.string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9-]+$/),

  district: z.string().trim().min(2).max(100),

  state: z.string().trim().min(2).max(100),
});

export const loginSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(1),
});

export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  req.body = result.data;
  next();
};
