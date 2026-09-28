import { z } from "zod";
import { ROLES } from "../../domain/roles.js";

const calendarDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const closureSchema = z.object({
  startsOn: calendarDate,
  endsOn: calendarDate,
  reason: z.string().trim().min(1).max(400),
});

export type ClosureInput = z.infer<typeof closureSchema>;

export const broadcastSchema = z.object({
  title: z.string().trim().min(1).max(120),
  message: z.string().trim().min(1).max(400),
  roles: z.array(z.enum(ROLES)).min(1),
});

export type BroadcastInput = z.infer<typeof broadcastSchema>;
