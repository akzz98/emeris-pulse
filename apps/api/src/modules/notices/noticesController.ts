import type { Request, Response } from "express";
import { closureSchema } from "./noticesSchemas.js";
import { announceClosure } from "./noticesService.js";

export async function closureHandler(req: Request, res: Response) {
  const body = closureSchema.parse(req.body);
  res.status(201).json(await announceClosure(body));
}
