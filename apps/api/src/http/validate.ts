import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";
import { HttpError } from "./httpError.js";

export function validateBody<T>(schema: ZodType<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      next(new HttpError(400, "VALIDATION_ERROR", "Request body is invalid.", parsed.error.flatten()));
      return;
    }
    req.body = parsed.data;
    next();
  };
}

export function validateQuery<T>(schema: ZodType<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      next(new HttpError(400, "VALIDATION_ERROR", "Request query is invalid.", parsed.error.flatten()));
      return;
    }
    res.locals.query = parsed.data;
    next();
  };
}

export function validateParams<T>(schema: ZodType<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.params);
    if (!parsed.success) {
      next(new HttpError(400, "VALIDATION_ERROR", "Request path is invalid.", parsed.error.flatten()));
      return;
    }
    res.locals.params = parsed.data;
    next();
  };
}
