import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(72),
  role: z.enum(["Student", "Staff"]),
  campusIdentifier: z.string().trim().min(4).max(64),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  phone: z.string().trim().max(32).optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(1).max(72),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(20),
});

export const contactSchema = z
  .object({
    firstName: z.string().trim().min(1).max(80).optional(),
    lastName: z.string().trim().min(1).max(80).optional(),
    phone: z.string().trim().max(32).nullable().optional(),
  })
  .refine(
    (value) => value.firstName !== undefined || value.lastName !== undefined || value.phone !== undefined,
    { message: "Provide a name or phone number to update." },
  );

export const roleSchema = z.object({
  role: z.enum(["Student", "Staff", "Instructor", "GymAdmin", "FacilityManager", "SystemAdmin"]),
});

export const userIdParams = z.object({
  userId: z.coerce.number().int().positive(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type ContactInput = z.infer<typeof contactSchema>;
export type RoleInput = z.infer<typeof roleSchema>;
export type UserIdParams = z.infer<typeof userIdParams>;
