import { Router } from "express";
import { authenticate } from "../../http/authenticate.js";
import { asyncHandler } from "../../http/asyncHandler.js";
import { validateParams } from "../../http/validate.js";
import { bookClassHandler, cancelBookingHandler, timetableHandler } from "./classController.js";
import { classIdParams } from "./classSchemas.js";

export const classRouter = Router();

classRouter.get("/classes/timetable", authenticate, asyncHandler(timetableHandler));
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
