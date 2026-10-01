import { Router } from "express";
import { authenticate, authorize } from "../../http/authenticate.js";
import { asyncHandler } from "../../http/asyncHandler.js";
import { rateLimit } from "../../http/rateLimit.js";
import { validateBody, validateParams, validateQuery } from "../../http/validate.js";
import {
  issuePassHandler,
  issueTemporaryPassHandler,
  listAccessLogHandler,
  occupancyHandler,
  passStatusHandler,
  redeemPassHandler,
  utilisationHandler,
} from "./accessPassController.js";
import { accessLogQuerySchema, passJtiParams, redeemPassSchema, temporaryPassSchema } from "./accessPassSchemas.js";

export const accessRouter = Router();

accessRouter.post("/access/passes", authenticate, asyncHandler(issuePassHandler));
accessRouter.get(
  "/access/passes/:jti/status",
  authenticate,
  validateParams(passJtiParams),
  asyncHandler(passStatusHandler),
);
// The signed pass is the credential. A door scanner does not sign in as the member.
// A class can arrive together. Repeated guesses of a pass token cannot.
accessRouter.post("/access/redeem", rateLimit(30, 60_000), validateBody(redeemPassSchema), asyncHandler(redeemPassHandler));
accessRouter.get(
  "/access/events",
  authenticate,
  authorize("GymAdmin", "SystemAdmin"),
  validateQuery(accessLogQuerySchema),
  asyncHandler(listAccessLogHandler),
);
accessRouter.get(
  "/access/utilisation",
  authenticate,
  authorize("FacilityManager", "GymAdmin", "SystemAdmin"),
  asyncHandler(utilisationHandler),
);
accessRouter.get(
  "/access/occupancy",
  authenticate,
  authorize("FacilityManager", "GymAdmin", "SystemAdmin"),
  asyncHandler(occupancyHandler),
);
accessRouter.post(
  "/access/passes/temporary",
  authenticate,
  authorize("GymAdmin", "SystemAdmin"),
  validateBody(temporaryPassSchema),
  asyncHandler(issueTemporaryPassHandler),
);
