import { z } from "zod";

export const reportPageSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});

export type ReportPageQuery = z.infer<typeof reportPageSchema>;
