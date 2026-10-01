import { Router } from "express";
import { authenticate, authorize } from "../../http/authenticate.js";
import { asyncHandler } from "../../http/asyncHandler.js";
import { validateBody } from "../../http/validate.js";
import {
  broadcastEstimateHandler,
  broadcastHandler,
  closureHandler,
  myNoticesHandler,
} from "./noticesController.js";
import { broadcastEstimateSchema, broadcastSchema, closureSchema } from "./noticesSchemas.js";

export const noticesRouter = Router();

noticesRouter.get("/notices/me", authenticate, asyncHandler(myNoticesHandler));

const broadcasters = authorize("GymAdmin", "SystemAdmin");

noticesRouter.post(
  "/notices/broadcast/estimate",
  authenticate,
  broadcasters,
  validateBody(broadcastEstimateSchema),
  asyncHandler(broadcastEstimateHandler),
);
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
