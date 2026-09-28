import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { DomainError } from "../domain/domainError.js";
import { HttpError } from "./httpError.js";

export function errorBody(code: string, message: string, details?: unknown) {
  return { error: { code, message, details: details ?? null } };
}

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof HttpError) {
    res.status(error.status).json(errorBody(error.code, error.message, error.details));
    return;
  }
  if (error instanceof DomainError) {
    res.status(409).json(errorBody("INVALID_STATE", error.message));
    return;
  }
  if (error instanceof ZodError) {
    res.status(400).json(errorBody("VALIDATION_ERROR", "Request is invalid.", error.flatten()));
    return;
  }
  if (error instanceof SyntaxError) {
    res.status(400).json(errorBody("VALIDATION_ERROR", "Request body must be JSON."));
    return;
  }
  console.error(error);
  res.status(500).json(errorBody("INTERNAL_ERROR", "Something went wrong."));
};
