import { Router } from "express";
import { authenticate } from "../../http/authenticate.js";
import { asyncHandler } from "../../http/asyncHandler.js";
import { validateParams } from "../../http/validate.js";
import { joinChallengeHandler, listChallengesHandler } from "./wellnessController.js";
import { challengeIdParams } from "./wellnessSchemas.js";

export const wellnessRouter = Router();

wellnessRouter.get("/challenges", authenticate, asyncHandler(listChallengesHandler));
wellnessRouter.post(
  "/challenges/:challengeId/join",
  authenticate,
  validateParams(challengeIdParams),
  asyncHandler(joinChallengeHandler),
);
