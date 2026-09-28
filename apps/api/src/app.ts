import cors from "cors";
import express from "express";
import helmet from "helmet";
import { errorBody, errorHandler } from "./http/errorHandler.js";
import { authRouter } from "./modules/auth/authRoutes.js";
import { membershipRouter } from "./modules/memberships/membershipRoutes.js";
import { userRouter } from "./modules/users/userRoutes.js";
import { healthRouter } from "./routes/health.js";

const defaultOrigins = ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175"];

export function createApp() {
  const app = express();
  const origins = (process.env.CORS_ORIGINS ?? defaultOrigins.join(","))
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.use(helmet());
  app.use(cors({ origin: origins }));
  app.use(express.json());
  app.use(healthRouter);
  app.use(authRouter);
  app.use(membershipRouter);
  app.use(userRouter);
  app.use((_req, res) => {
    res.status(404).json(errorBody("NOT_FOUND", "That route does not exist."));
  });
  app.use(errorHandler);
  return app;
}
