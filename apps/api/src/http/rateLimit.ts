import type { NextFunction, Request, Response } from "express";
import { HttpError } from "./httpError.js";

type Bucket = { count: number; resetAt: number };

// Guessing a password or a pass token is limited per caller. A normal sign-in or scan stays under the limit.
export function rateLimit(limit: number, windowMs: number) {
  const buckets = new Map<string, Bucket>();
  return (req: Request, _res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = req.ip ?? "unknown";
    const current = buckets.get(key);
    if (!current || current.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }
    current.count += 1;
    if (current.count > limit) {
      next(new HttpError(429, "RATE_LIMITED", "Too many attempts. Wait a minute and try again."));
      return;
    }
    next();
  };
}
