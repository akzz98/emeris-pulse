import { z } from "zod";
import { ROLES } from "../../domain/roles.js";

const calendarDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const closureSchema = z.object({
  startsOn: calendarDate,
  endsOn: calendarDate,
  reason: z.string().trim().min(1, "Enter a reason.").max(400, "Use at most 400 characters."),
});

export type ClosureInput = z.infer<typeof closureSchema>;

export const broadcastSchema = z.object({
  title: z.string().trim().min(1, "Enter a title.").max(120, "Use at most 120 characters."),
  message: z.string().trim().min(1, "Enter a message.").max(400, "Use at most 400 characters."),
  roles: z.array(z.enum(ROLES)).min(1, "Select at least one role."),
});

export type BroadcastInput = z.infer<typeof broadcastSchema>;

export const broadcastEstimateSchema = z.object({
  roles: z.array(z.enum(ROLES)).min(1, "Select at least one role."),
});

export type BroadcastEstimateInput = z.infer<typeof broadcastEstimateSchema>;
