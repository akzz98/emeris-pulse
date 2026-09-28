import type { Request, Response } from "express";
import { broadcastSchema, closureSchema } from "./noticesSchemas.js";
import { announceClosure, broadcastNotice } from "./noticesService.js";

export async function broadcastHandler(req: Request, res: Response) {
  const body = broadcastSchema.parse(req.body);
  res.status(201).json(await broadcastNotice(body));
}

export async function closureHandler(req: Request, res: Response) {
  const body = closureSchema.parse(req.body);
  res.status(201).json(await announceClosure(body));
}
