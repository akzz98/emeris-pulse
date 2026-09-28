import { Router } from "express";
import { authenticate, authorize } from "../../http/authenticate.js";
import { asyncHandler } from "../../http/asyncHandler.js";
import { validateQuery } from "../../http/validate.js";
import { classFillHandler, equipmentDowntimeHandler, wellnessParticipationHandler } from "./reportsController.js";
import { reportPageSchema } from "./reportsSchemas.js";

export const reportsRouter = Router();

const reportReaders = authorize("GymAdmin", "FacilityManager", "SystemAdmin");

reportsRouter.get(
  "/reports/class-fill",
  authenticate,
  reportReaders,
  validateQuery(reportPageSchema),
  asyncHandler(classFillHandler),
);
reportsRouter.get(
  "/reports/equipment-downtime",
  authenticate,
  reportReaders,
  validateQuery(reportPageSchema),
  asyncHandler(equipmentDowntimeHandler),
);
reportsRouter.get(
  "/reports/wellness",
  authenticate,
  reportReaders,
  validateQuery(reportPageSchema),
  asyncHandler(wellnessParticipationHandler),
);
