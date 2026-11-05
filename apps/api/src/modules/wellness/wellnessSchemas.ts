import { z } from "zod";

const calendarDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a date.");

export const challengeIdParams = z.object({
  challengeId: z.coerce.number().int().positive(),
});

export const createChallengeSchema = z.object({
  title: z.string().trim().min(1, "Enter a challenge title.").max(120, "Use at most 120 characters."),
  description: z.string().trim().min(1, "Enter a description.").max(400, "Use at most 400 characters."),
  startsOn: calendarDate,
  endsOn: calendarDate,
});

export type CreateChallengeInput = z.infer<typeof createChallengeSchema>;

export const updateChallengeSchema = createChallengeSchema;

export type UpdateChallengeInput = z.infer<typeof updateChallengeSchema>;
