import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { isRole, type Role } from "../domain/roles.js";
import { HttpError } from "./httpError.js";

export type AuthUser = {
  id: number;
  role: Role;
  email: string;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

function secret(): string {
  const value = process.env.JWT_SECRET;
  if (!value || value.length < 16) {
    throw new HttpError(503, "AUTH_NOT_CONFIGURED", "JWT secret is not configured.");
  }
  return value;
}

export function signAccessToken(user: AuthUser): string {
  return jwt.sign({ sub: String(user.id), role: user.role, email: user.email }, secret(), {
    expiresIn: 15 * 60,
  });
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.header("authorization");
  if (!header?.startsWith("Bearer ")) {
    next(new HttpError(401, "UNAUTHENTICATED", "Sign in is required."));
    return;
  }
  try {
    const payload = jwt.verify(header.slice("Bearer ".length), secret());
    if (typeof payload === "string" || typeof payload.sub !== "string" || typeof payload.role !== "string") {
      next(new HttpError(401, "UNAUTHENTICATED", "Sign in is required."));
      return;
    }
    if (!isRole(payload.role) || !payload.email || typeof payload.email !== "string") {
      next(new HttpError(401, "UNAUTHENTICATED", "Sign in is required."));
      return;
    }
    const id = Number(payload.sub);
    if (!Number.isInteger(id)) {
      next(new HttpError(401, "UNAUTHENTICATED", "Sign in is required."));
      return;
    }
    req.user = { id, role: payload.role, email: payload.email };
    next();
  } catch (error) {
    if (error instanceof HttpError) {
      next(error);
      return;
    }
    next(new HttpError(401, "UNAUTHENTICATED", "Sign in is required."));
  }
}

export function authorize(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      next(new HttpError(403, "FORBIDDEN", "You do not have access to this action."));
      return;
    }
    next();
  };
}

export function requireUser(req: Request): AuthUser {
  if (!req.user) {
    throw new HttpError(401, "UNAUTHENTICATED", "Sign in is required.");
  }
  return req.user;
}
