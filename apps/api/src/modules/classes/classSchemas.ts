import { z } from "zod";

export const classIdParams = z.object({
  classId: z.coerce.number().int().positive(),
});

export const localDateTime = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/);

export const publishClassSchema = z.object({
  title: z.string().trim().min(1, "Enter a class title.").max(120, "Use at most 120 characters."),
  instructorEmail: z.string().trim().email("Enter a valid instructor email.").max(255, "Enter a valid instructor email."),
  startsAt: localDateTime,
  endsAt: localDateTime,
  capacity: z
    .number({ invalid_type_error: "Enter how many seats." })
    .int("Enter how many seats.")
    .positive("Enter how many seats.")
    .max(500, "Capacity cannot exceed 500."),
  location: z.string().trim().min(1, "Enter a studio or room.").max(80, "Use at most 80 characters."),
});

export const classMessageSchema = z.object({
  message: z.string().trim().min(1, "Enter a message.").max(400, "Use at most 400 characters."),
});

export const attendanceSchema = z.object({
  userId: z.number().int().positive(),
  mark: z.enum(["Attended", "Absent"]),
});

export type PublishClassInput = z.infer<typeof publishClassSchema>;
export type AttendanceInput = z.infer<typeof attendanceSchema>;
