import { Router } from "express";
import { authenticate, authorize } from "../../http/authenticate.js";
import { asyncHandler } from "../../http/asyncHandler.js";
import { classFillHandler, equipmentDowntimeHandler, wellnessParticipationHandler } from "./reportsController.js";

export const reportsRouter = Router();

const reportReaders = authorize("GymAdmin", "FacilityManager", "SystemAdmin");

reportsRouter.get("/reports/class-fill", authenticate, reportReaders, asyncHandler(classFillHandler));
reportsRouter.get("/reports/equipment-downtime", authenticate, reportReaders, asyncHandler(equipmentDowntimeHandler));
reportsRouter.get("/reports/wellness", authenticate, reportReaders, asyncHandler(wellnessParticipationHandler));
