import { Router } from "express";
import { authenticate, authorize } from "../../http/authenticate.js";
import { asyncHandler } from "../../http/asyncHandler.js";
import { validateBody, validateParams } from "../../http/validate.js";
import {
  createChallengeHandler,
  joinChallengeHandler,
  listChallengesHandler,
  managedChallengesHandler,
} from "./wellnessController.js";
import { challengeIdParams, createChallengeSchema } from "./wellnessSchemas.js";

export const wellnessRouter = Router();

const challengeEditors = authorize("GymAdmin", "SystemAdmin");

wellnessRouter.get("/challenges/manage", authenticate, challengeEditors, asyncHandler(managedChallengesHandler));
wellnessRouter.post(
  "/challenges",
  authenticate,
  challengeEditors,
  validateBody(createChallengeSchema),
  asyncHandler(createChallengeHandler),
);
wellnessRouter.get("/challenges", authenticate, asyncHandler(listChallengesHandler));
wellnessRouter.post(
  "/challenges/:challengeId/join",
  authenticate,
  validateParams(challengeIdParams),
  asyncHandler(joinChallengeHandler),
);
