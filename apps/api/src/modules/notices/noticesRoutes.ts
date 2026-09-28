import { Router } from "express";
import { authenticate, authorize } from "../../http/authenticate.js";
import { asyncHandler } from "../../http/asyncHandler.js";
import { validateBody } from "../../http/validate.js";
import { broadcastHandler, closureHandler } from "./noticesController.js";
import { broadcastSchema, closureSchema } from "./noticesSchemas.js";

export const noticesRouter = Router();

const broadcasters = authorize("GymAdmin", "SystemAdmin");

noticesRouter.post(
  "/notices/broadcast",
  authenticate,
  broadcasters,
  validateBody(broadcastSchema),
  asyncHandler(broadcastHandler),
);
noticesRouter.post(
  "/notices/closure",
  authenticate,
  authorize("GymAdmin", "FacilityManager", "SystemAdmin"),
  validateBody(closureSchema),
  asyncHandler(closureHandler),
);
