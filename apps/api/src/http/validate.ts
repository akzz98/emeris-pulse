import type { NextFunction, Request, Response } from "express";
import type { ZodError, ZodType } from "zod";
import { HttpError } from "./httpError.js";

// The message names the first failing field. fieldErrors in the details lets the form mark that input.
function validationError(error: ZodError, fallback: string): HttpError {
  const message = error.issues.find((issue) => issue.message.length > 0)?.message ?? fallback;
  return new HttpError(400, "VALIDATION_ERROR", message, error.flatten());
}

export function validateBody<T>(schema: ZodType<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      next(validationError(parsed.error, "Request body is invalid."));
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
      next(validationError(parsed.error, "Request query is invalid."));
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
      next(validationError(parsed.error, "Request path is invalid."));
      return;
    }
    res.locals.params = parsed.data;
    next();
  };
}
