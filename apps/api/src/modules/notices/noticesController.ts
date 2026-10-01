import type { Request, Response } from "express";
import { requireUser } from "../../http/authenticate.js";
import { broadcastEstimateSchema, broadcastSchema, closureSchema } from "./noticesSchemas.js";
import { announceClosure, broadcastNotice, estimateBroadcast, listMyNotices } from "./noticesService.js";

export async function myNoticesHandler(req: Request, res: Response) {
  const user = requireUser(req);
  res.status(200).json(await listMyNotices(user.id));
}

export async function broadcastEstimateHandler(req: Request, res: Response) {
  const body = broadcastEstimateSchema.parse(req.body);
  res.status(200).json(await estimateBroadcast(body));
}

export async function broadcastHandler(req: Request, res: Response) {
  const body = broadcastSchema.parse(req.body);
  res.status(201).json(await broadcastNotice(body));
}

export async function closureHandler(req: Request, res: Response) {
  const body = closureSchema.parse(req.body);
  res.status(201).json(await announceClosure(body));
}
