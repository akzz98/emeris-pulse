import { Router } from "express";
import { authenticate } from "../../http/authenticate.js";
import { asyncHandler } from "../../http/asyncHandler.js";
import { validateBody } from "../../http/validate.js";
import {
  currentSessionHandler,
  endSessionHandler,
  listEquipmentHandler,
  startSessionHandler,
} from "./equipmentController.js";
import { startSessionSchema } from "./equipmentSchemas.js";

export const equipmentRouter = Router();

equipmentRouter.get("/equipment", authenticate, asyncHandler(listEquipmentHandler));
equipmentRouter.get("/equipment/sessions/current", authenticate, asyncHandler(currentSessionHandler));
equipmentRouter.post(
  "/equipment/sessions",
  authenticate,
  validateBody(startSessionSchema),
  asyncHandler(startSessionHandler),
);
equipmentRouter.post("/equipment/sessions/current/end", authenticate, asyncHandler(endSessionHandler));
