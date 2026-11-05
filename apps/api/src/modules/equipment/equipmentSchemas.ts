import { z } from "zod";

// Machine codes are printed on the floor (for example TREAD-01). Case does not matter.
export const startSessionSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Enter the machine code.")
    .max(32, "Use at most 32 characters.")
    .transform((value) => value.toUpperCase()),
});

export type StartSessionInput = z.infer<typeof startSessionSchema>;

export const faultSchema = z.object({
  description: z.string().trim().min(1, "Describe what is wrong.").max(400, "Use at most 400 characters."),
});

export type FaultInput = z.infer<typeof faultSchema>;

export const studioFaultSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Enter the machine code.")
    .max(32, "Use at most 32 characters.")
    .transform((value) => value.toUpperCase()),
  description: z.string().trim().min(1, "Describe what is wrong.").max(400, "Use at most 400 characters."),
});

export type StudioFaultInput = z.infer<typeof studioFaultSchema>;

export const equipmentIdParams = z.object({
  equipmentId: z.coerce.number().int().positive(),
});

export const ticketIdParams = z.object({
  ticketId: z.coerce.number().int().positive(),
});
