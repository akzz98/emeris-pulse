import { z } from "zod";

export const redeemPassSchema = z.object({
  token: z.string().min(20),
});

export const accessLogQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});

export const temporaryPassSchema = z.object({
  email: z.string().trim().email().max(255),
});

export type RedeemPassInput = z.infer<typeof redeemPassSchema>;
export type AccessLogQuery = z.infer<typeof accessLogQuerySchema>;
export type TemporaryPassInput = z.infer<typeof temporaryPassSchema>;
