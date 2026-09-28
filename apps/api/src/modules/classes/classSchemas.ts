import { z } from "zod";

export const classIdParams = z.object({
  classId: z.coerce.number().int().positive(),
});

export type ClassIdParams = z.infer<typeof classIdParams>;
