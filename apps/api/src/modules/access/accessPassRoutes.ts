import { Router } from "express";
import { authenticate, authorize } from "../../http/authenticate.js";
import { asyncHandler } from "../../http/asyncHandler.js";
import { validateBody, validateQuery } from "../../http/validate.js";
import { issuePassHandler, issueTemporaryPassHandler, listAccessLogHandler, redeemPassHandler } from "./accessPassController.js";
import { accessLogQuerySchema, redeemPassSchema, temporaryPassSchema } from "./accessPassSchemas.js";

export const accessRouter = Router();

accessRouter.post("/access/passes", authenticate, asyncHandler(issuePassHandler));
// The signed pass is the credential. A door scanner does not sign in as the member.
accessRouter.post("/access/redeem", validateBody(redeemPassSchema), asyncHandler(redeemPassHandler));
accessRouter.get(
  "/access/events",
  authenticate,
  authorize("GymAdmin", "SystemAdmin"),
  validateQuery(accessLogQuerySchema),
  asyncHandler(listAccessLogHandler),
);
accessRouter.post(
  "/access/passes/temporary",
  authenticate,
  authorize("GymAdmin", "SystemAdmin"),
  validateBody(temporaryPassSchema),
  asyncHandler(issueTemporaryPassHandler),
);
