import { Router } from "express";
import { authenticate } from "../../http/authenticate.js";
import { asyncHandler } from "../../http/asyncHandler.js";
import { issuePassHandler } from "./accessPassController.js";

export const accessRouter = Router();

accessRouter.post("/access/passes", authenticate, asyncHandler(issuePassHandler));
