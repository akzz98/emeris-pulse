import { Router } from "express";
import { asyncHandler } from "../../http/asyncHandler.js";
import { validateBody } from "../../http/validate.js";
import { loginHandler, refreshHandler, registerHandler } from "./authController.js";
import { loginSchema, refreshSchema, registerSchema } from "./authSchemas.js";

export const authRouter = Router();

authRouter.post("/auth/register", validateBody(registerSchema), asyncHandler(registerHandler));
authRouter.post("/auth/login", validateBody(loginSchema), asyncHandler(loginHandler));
authRouter.post("/auth/refresh", validateBody(refreshSchema), asyncHandler(refreshHandler));
