import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().trim().email("Enter a valid email address.").max(255, "Enter a valid email address."),
  password: z.string().min(8, "Use at least 8 characters.").max(72, "Use at most 72 characters."),
  role: z.enum(["Student", "Staff"]),
  campusIdentifier: z
    .string()
    .trim()
    .min(4, "Use at least 4 characters.")
    .max(64, "Use at most 64 characters."),
  firstName: z.string().trim().min(1, "Enter a first name.").max(80, "Use at most 80 characters."),
  lastName: z.string().trim().min(1, "Enter a last name.").max(80, "Use at most 80 characters."),
  phone: z.string().trim().max(32, "Use at most 32 characters.").optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address.").max(255, "Enter a valid email address."),
  password: z.string().min(1, "Enter your password.").max(72, "Use at most 72 characters."),
});

export const passwordSchema = z.object({
  password: z.string().min(8, "Use at least 8 characters.").max(72, "Use at most 72 characters."),
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
export type PasswordInput = z.infer<typeof passwordSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type ContactInput = z.infer<typeof contactSchema>;
export type RoleInput = z.infer<typeof roleSchema>;
export type UserIdParams = z.infer<typeof userIdParams>;
