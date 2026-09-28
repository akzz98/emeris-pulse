import { z } from "zod";

export const classIdParams = z.object({
  classId: z.coerce.number().int().positive(),
});

export const localDateTime = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/);

export const publishClassSchema = z.object({
  title: z.string().trim().min(1).max(120),
  instructorEmail: z.string().trim().email().max(255),
  startsAt: localDateTime,
  endsAt: localDateTime,
  capacity: z.number().int().positive().max(500),
  location: z.string().trim().min(1).max(80),
});

export const attendanceSchema = z.object({
  userId: z.number().int().positive(),
  mark: z.enum(["Attended", "Absent"]),
});

export type PublishClassInput = z.infer<typeof publishClassSchema>;
export type AttendanceInput = z.infer<typeof attendanceSchema>;
