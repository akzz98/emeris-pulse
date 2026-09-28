import { z } from "zod";

export const challengeIdParams = z.object({
  challengeId: z.coerce.number().int().positive(),
});
