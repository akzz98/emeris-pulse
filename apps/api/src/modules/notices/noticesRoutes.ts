import { Router } from "express";
import { authenticate, authorize } from "../../http/authenticate.js";
import { asyncHandler } from "../../http/asyncHandler.js";
import { validateBody } from "../../http/validate.js";
import { closureHandler } from "./noticesController.js";
import { closureSchema } from "./noticesSchemas.js";

export const noticesRouter = Router();

noticesRouter.post(
  "/notices/closure",
  authenticate,
  authorize("GymAdmin", "FacilityManager", "SystemAdmin"),
  validateBody(closureSchema),
  asyncHandler(closureHandler),
);
