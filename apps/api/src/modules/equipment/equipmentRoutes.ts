import { Router } from "express";
import { authenticate, authorize } from "../../http/authenticate.js";
import { asyncHandler } from "../../http/asyncHandler.js";
import { validateBody } from "../../http/validate.js";
import {
  currentSessionHandler,
  endSessionHandler,
  listEquipmentHandler,
  reportFaultHandler,
  reportStudioFaultHandler,
  startSessionHandler,
  studioEquipmentHandler,
} from "./equipmentController.js";
import { faultSchema, startSessionSchema, studioFaultSchema } from "./equipmentSchemas.js";

export const equipmentRouter = Router();

const instructor = authorize("Instructor");

equipmentRouter.get("/equipment/studio", authenticate, instructor, asyncHandler(studioEquipmentHandler));
equipmentRouter.post(
  "/equipment/studio/tickets",
  authenticate,
  instructor,
  validateBody(studioFaultSchema),
  asyncHandler(reportStudioFaultHandler),
);
equipmentRouter.get("/equipment", authenticate, asyncHandler(listEquipmentHandler));
equipmentRouter.get("/equipment/sessions/current", authenticate, asyncHandler(currentSessionHandler));
equipmentRouter.post(
  "/equipment/sessions",
  authenticate,
  validateBody(startSessionSchema),
  asyncHandler(startSessionHandler),
);
equipmentRouter.post(
  "/equipment/sessions/current/fault",
  authenticate,
  validateBody(faultSchema),
  asyncHandler(reportFaultHandler),
);
equipmentRouter.post("/equipment/sessions/current/end", authenticate, asyncHandler(endSessionHandler));
