import { Router } from "express";
import { authenticate } from "../../http/authenticate.js";
import { asyncHandler } from "../../http/asyncHandler.js";
import { getMyActivityHandler } from "./activityController.js";

export const activityRouter = Router();

activityRouter.get("/activity/me", authenticate, asyncHandler(getMyActivityHandler));
