import { z } from "zod";

const calendarDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const challengeIdParams = z.object({
  challengeId: z.coerce.number().int().positive(),
});

export const createChallengeSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(400),
  startsOn: calendarDate,
  endsOn: calendarDate,
});

export type CreateChallengeInput = z.infer<typeof createChallengeSchema>;

export const updateChallengeSchema = createChallengeSchema;

export type UpdateChallengeInput = z.infer<typeof updateChallengeSchema>;
