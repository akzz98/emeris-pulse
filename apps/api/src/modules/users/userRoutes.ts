import { Router } from "express";
import { authenticate, authorize } from "../../http/authenticate.js";
import { asyncHandler } from "../../http/asyncHandler.js";
import { validateBody, validateParams } from "../../http/validate.js";
import { contactSchema, roleSchema, userIdParams } from "../auth/authSchemas.js";
import { assignRoleHandler, getProfileHandler, updateContactHandler } from "./userController.js";

export const userRouter = Router();

userRouter.get("/me", authenticate, asyncHandler(getProfileHandler));
userRouter.patch("/me", authenticate, validateBody(contactSchema), asyncHandler(updateContactHandler));
userRouter.patch(
  "/users/:userId/role",
  authenticate,
  authorize("SystemAdmin"),
  validateParams(userIdParams),
  validateBody(roleSchema),
  asyncHandler(assignRoleHandler),
);
