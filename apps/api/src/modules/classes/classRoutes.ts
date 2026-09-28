import { Router } from "express";
import { authenticate, authorize } from "../../http/authenticate.js";
import { asyncHandler } from "../../http/asyncHandler.js";
import { validateParams } from "../../http/validate.js";
import { bookClassHandler, cancelBookingHandler, rosterHandler, timetableHandler } from "./classController.js";
import { classIdParams } from "./classSchemas.js";

export const classRouter = Router();

classRouter.get("/classes/timetable", authenticate, asyncHandler(timetableHandler));
classRouter.get(
  "/classes/roster",
  authenticate,
  authorize("Instructor"),
  asyncHandler(rosterHandler),
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
