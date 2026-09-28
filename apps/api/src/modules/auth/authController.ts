import type { Request, Response } from "express";
import { loginSchema, refreshSchema, registerSchema } from "./authSchemas.js";
import { login, refresh, register } from "./authService.js";

export async function registerHandler(req: Request, res: Response) {
  const result = await register(registerSchema.parse(req.body));
  res.status(201).json(result);
}

export async function loginHandler(req: Request, res: Response) {
  const result = await login(loginSchema.parse(req.body));
  res.status(200).json(result);
}

export async function refreshHandler(req: Request, res: Response) {
  const result = await refresh(refreshSchema.parse(req.body));
  res.status(200).json(result);
}
