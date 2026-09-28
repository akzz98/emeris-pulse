import { z } from "zod";

export const redeemPassSchema = z.object({
  token: z.string().min(20),
});

export const accessLogQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});

export type RedeemPassInput = z.infer<typeof redeemPassSchema>;
export type AccessLogQuery = z.infer<typeof accessLogQuerySchema>;
