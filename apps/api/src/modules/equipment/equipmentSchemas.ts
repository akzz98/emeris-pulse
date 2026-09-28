import { z } from "zod";

// Machine codes are printed on the floor (for example TREAD-01). Case does not matter.
export const startSessionSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1)
    .max(32)
    .transform((value) => value.toUpperCase()),
});

export type StartSessionInput = z.infer<typeof startSessionSchema>;
