import { Router } from "express";
import { authenticate, authorize } from "../../http/authenticate.js";
import { asyncHandler } from "../../http/asyncHandler.js";
import { validateBody, validateParams } from "../../http/validate.js";
import {
  createChallengeHandler,
  endChallengeHandler,
  joinChallengeHandler,
  listChallengesHandler,
  managedChallengesHandler,
  updateChallengeHandler,
} from "./wellnessController.js";
import { challengeIdParams, createChallengeSchema, updateChallengeSchema } from "./wellnessSchemas.js";

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
wellnessRouter.patch(
  "/challenges/:challengeId",
  authenticate,
  challengeEditors,
  validateParams(challengeIdParams),
  validateBody(updateChallengeSchema),
  asyncHandler(updateChallengeHandler),
);
wellnessRouter.post(
  "/challenges/:challengeId/end",
  authenticate,
  challengeEditors,
  validateParams(challengeIdParams),
  asyncHandler(endChallengeHandler),
);
wellnessRouter.get("/challenges", authenticate, asyncHandler(listChallengesHandler));
wellnessRouter.post(
  "/challenges/:challengeId/join",
  authenticate,
  validateParams(challengeIdParams),
  asyncHandler(joinChallengeHandler),
);
