import { z } from "zod";

export const createVillageSchema = z.object({
  name: z.string().trim().min(2).max(100),
});

export const updateVillageSchema = z.object({
  name: z.string().trim().min(2).max(100),
});
