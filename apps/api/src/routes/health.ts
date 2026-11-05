import { Router } from "express";
import { getPool } from "../db/pool.js";
import { asyncHandler } from "../http/asyncHandler.js";

export const healthRouter = Router();

// A process that cannot reach Azure SQL is not healthy. Callers treat any status other than ok as down.
healthRouter.get(
  "/health",
  asyncHandler(async (_req, res) => {
    try {
      const pool = await getPool();
      await pool.request().query("SELECT 1 AS ok");
      res.status(200).json({ status: "ok", service: "emeris-pulse-api", database: "ok" });
    } catch {
      res.status(503).json({ status: "unavailable", service: "emeris-pulse-api", database: "unavailable" });
    }
  }),
);
