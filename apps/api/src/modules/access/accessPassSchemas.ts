import { z } from "zod";

export const redeemPassSchema = z.object({
  token: z.string().min(20),
});

export type RedeemPassInput = z.infer<typeof redeemPassSchema>;
