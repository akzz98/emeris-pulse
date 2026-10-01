import { Router } from "express";
import { authenticate, authorize } from "../../http/authenticate.js";
import { asyncHandler } from "../../http/asyncHandler.js";
import { validateBody, validateParams } from "../../http/validate.js";
import {
  currentSessionHandler,
  endSessionHandler,
  listEquipmentHandler,
  reportFaultHandler,
  reportFloorFaultHandler,
  reportStudioFaultHandler,
  startSessionHandler,
  studioEquipmentHandler,
  closeTicketHandler,
  takeOutOfServiceHandler,
  ticketQueueHandler,
} from "./equipmentController.js";
import { equipmentIdParams, faultSchema, startSessionSchema, studioFaultSchema, ticketIdParams } from "./equipmentSchemas.js";

export const equipmentRouter = Router();

const instructor = authorize("Instructor");
const facility = authorize("FacilityManager", "GymAdmin", "SystemAdmin");

equipmentRouter.get("/equipment/tickets", authenticate, facility, asyncHandler(ticketQueueHandler));
equipmentRouter.post(
  "/equipment/tickets/:ticketId/close",
  authenticate,
  facility,
  validateParams(ticketIdParams),
  asyncHandler(closeTicketHandler),
);
equipmentRouter.post(
  "/equipment/:equipmentId/out-of-service",
  authenticate,
  facility,
  validateParams(equipmentIdParams),
  asyncHandler(takeOutOfServiceHandler),
);

equipmentRouter.get("/equipment/studio", authenticate, instructor, asyncHandler(studioEquipmentHandler));
equipmentRouter.post(
  "/equipment/studio/tickets",
  authenticate,
  instructor,
  validateBody(studioFaultSchema),
  asyncHandler(reportStudioFaultHandler),
);
equipmentRouter.get("/equipment", authenticate, asyncHandler(listEquipmentHandler));
equipmentRouter.post(
  "/equipment/fault",
  authenticate,
  validateBody(studioFaultSchema),
  asyncHandler(reportFloorFaultHandler),
);
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
