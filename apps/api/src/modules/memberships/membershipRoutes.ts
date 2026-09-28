import { Router } from "express";
import { authenticate, authorize } from "../../http/authenticate.js";
import { asyncHandler } from "../../http/asyncHandler.js";
import { validateParams } from "../../http/validate.js";
import { userIdParams } from "../auth/authSchemas.js";
import {
  activateMembershipHandler,
  freezeMembershipHandler,
  getMyMembershipHandler,
  listActiveMembershipsHandler,
  listFrozenMembershipsHandler,
  listPendingMembershipsHandler,
} from "./membershipController.js";

export const membershipRouter = Router();

membershipRouter.get("/memberships/me", authenticate, asyncHandler(getMyMembershipHandler));
membershipRouter.get(
  "/memberships/pending",
  authenticate,
  authorize("GymAdmin", "SystemAdmin"),
  asyncHandler(listPendingMembershipsHandler),
);
membershipRouter.get(
  "/memberships/active",
  authenticate,
  authorize("GymAdmin", "SystemAdmin"),
  asyncHandler(listActiveMembershipsHandler),
);
membershipRouter.get(
  "/memberships/frozen",
  authenticate,
  authorize("GymAdmin", "SystemAdmin"),
  asyncHandler(listFrozenMembershipsHandler),
);
membershipRouter.post(
  "/memberships/:userId/activate",
  authenticate,
  authorize("GymAdmin", "SystemAdmin"),
  validateParams(userIdParams),
  asyncHandler(activateMembershipHandler),
);
membershipRouter.post(
  "/memberships/:userId/freeze",
  authenticate,
  authorize("GymAdmin", "SystemAdmin"),
  validateParams(userIdParams),
  asyncHandler(freezeMembershipHandler),
);
