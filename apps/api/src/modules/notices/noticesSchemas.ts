import { z } from "zod";

const calendarDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const closureSchema = z.object({
  startsOn: calendarDate,
  endsOn: calendarDate,
  reason: z.string().trim().min(1).max(400),
});

export type ClosureInput = z.infer<typeof closureSchema>;
