import { Router } from "express";
import { authenticate } from "../../http/authenticate.js";
import { asyncHandler } from "../../http/asyncHandler.js";
import { validateBody } from "../../http/validate.js";
import { issuePassHandler, redeemPassHandler } from "./accessPassController.js";
import { redeemPassSchema } from "./accessPassSchemas.js";

export const accessRouter = Router();

accessRouter.post("/access/passes", authenticate, asyncHandler(issuePassHandler));
// The signed pass is the credential. A door scanner does not sign in as the member.
accessRouter.post("/access/redeem", validateBody(redeemPassSchema), asyncHandler(redeemPassHandler));
