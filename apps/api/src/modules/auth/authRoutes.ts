import { Router } from "express";
import { asyncHandler } from "../../http/asyncHandler.js";
import { rateLimit } from "../../http/rateLimit.js";
import { validateBody } from "../../http/validate.js";
import { loginHandler, refreshHandler, registerHandler } from "./authController.js";
import { loginSchema, refreshSchema, registerSchema } from "./authSchemas.js";

export const authRouter = Router();

authRouter.post("/auth/register", validateBody(registerSchema), asyncHandler(registerHandler));
// Ten tries a minute. A mistyped password can be corrected. A guessing script cannot keep going.
authRouter.post("/auth/login", rateLimit(10, 60_000), validateBody(loginSchema), asyncHandler(loginHandler));
authRouter.post("/auth/refresh", validateBody(refreshSchema), asyncHandler(refreshHandler));
