import { Router } from "express";
import { authenticate, authorize } from "../../http/authenticate.js";
import { asyncHandler } from "../../http/asyncHandler.js";
import { validateBody, validateParams } from "../../http/validate.js";
import {
  attendanceHandler,
  bookClassHandler,
  cancelBookingHandler,
  cancelClassHandler,
  classMessageHandler,
  instructorClassesHandler,
  managedClassesHandler,
  publishClassHandler,
  recordAttendanceHandler,
  rosterHandler,
  timetableHandler,
  trendsHandler,
  updateClassHandler,
} from "./classController.js";
import { attendanceSchema, classIdParams, classMessageSchema, publishClassSchema } from "./classSchemas.js";

export const classRouter = Router();

const instructor = authorize("Instructor");
const timetableEditors = authorize("GymAdmin", "SystemAdmin");

classRouter.get("/classes/timetable", authenticate, asyncHandler(timetableHandler));
classRouter.get("/classes/roster", authenticate, instructor, asyncHandler(rosterHandler));
classRouter.get("/classes/attendance", authenticate, instructor, asyncHandler(attendanceHandler));
classRouter.get("/classes/trends", authenticate, instructor, asyncHandler(trendsHandler));
classRouter.get("/classes/mine", authenticate, instructor, asyncHandler(instructorClassesHandler));
classRouter.get("/classes/manage", authenticate, timetableEditors, asyncHandler(managedClassesHandler));
classRouter.post(
  "/classes",
  authenticate,
  timetableEditors,
  validateBody(publishClassSchema),
  asyncHandler(publishClassHandler),
);
classRouter.patch(
  "/classes/:classId",
  authenticate,
  timetableEditors,
  validateParams(classIdParams),
  validateBody(publishClassSchema),
  asyncHandler(updateClassHandler),
);
classRouter.post(
  "/classes/:classId/attendance",
  authenticate,
  instructor,
  validateParams(classIdParams),
  validateBody(attendanceSchema),
  asyncHandler(recordAttendanceHandler),
);
classRouter.post(
  "/classes/:classId/message",
  authenticate,
  instructor,
  validateParams(classIdParams),
  validateBody(classMessageSchema),
  asyncHandler(classMessageHandler),
);
classRouter.post(
  "/classes/:classId/cancel",
  authenticate,
  instructor,
  validateParams(classIdParams),
  asyncHandler(cancelClassHandler),
);
classRouter.post(
  "/classes/:classId/bookings",
  authenticate,
  validateParams(classIdParams),
  asyncHandler(bookClassHandler),
);
classRouter.delete(
  "/classes/:classId/bookings/me",
  authenticate,
  validateParams(classIdParams),
  asyncHandler(cancelBookingHandler),
);
