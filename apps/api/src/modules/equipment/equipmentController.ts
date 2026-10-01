import type { Request, Response } from "express";
import { requireUser } from "../../http/authenticate.js";
import {
  currentSession,
  endSession,
  listEquipment,
  listStudioEquipment,
  listTicketQueue,
  closeTicket,
  reportFault,
  reportFloorFault,
  reportUnsafeStudio,
  startSession,
  takeOutOfService,
} from "./equipmentService.js";
import { equipmentIdParams, faultSchema, startSessionSchema, studioFaultSchema, ticketIdParams } from "./equipmentSchemas.js";

export async function listEquipmentHandler(_req: Request, res: Response) {
  res.status(200).json(await listEquipment());
}

export async function currentSessionHandler(req: Request, res: Response) {
  const user = requireUser(req);
  res.status(200).json(await currentSession(user.id));
}

export async function startSessionHandler(req: Request, res: Response) {
  const user = requireUser(req);
  const body = startSessionSchema.parse(req.body);
  res.status(201).json(await startSession(user.id, body.code));
}

export async function reportFaultHandler(req: Request, res: Response) {
  const user = requireUser(req);
  const body = faultSchema.parse(req.body);
  res.status(201).json(await reportFault(user.id, body.description));
}

export async function reportFloorFaultHandler(req: Request, res: Response) {
  const user = requireUser(req);
  const body = studioFaultSchema.parse(req.body);
  res.status(201).json(await reportFloorFault(user.id, body.code, body.description));
}

export async function studioEquipmentHandler(_req: Request, res: Response) {
  res.status(200).json(await listStudioEquipment());
}

export async function reportStudioFaultHandler(req: Request, res: Response) {
  const user = requireUser(req);
  const body = studioFaultSchema.parse(req.body);
  res.status(201).json(await reportUnsafeStudio(user.id, body.code, body.description));
}

export async function ticketQueueHandler(_req: Request, res: Response) {
  res.status(200).json(await listTicketQueue());
}

export async function closeTicketHandler(req: Request, res: Response) {
  requireUser(req);
  const params = ticketIdParams.parse(res.locals.params);
  res.status(200).json(await closeTicket(params.ticketId));
}

export async function takeOutOfServiceHandler(req: Request, res: Response) {
  requireUser(req);
  const params = equipmentIdParams.parse(res.locals.params);
  res.status(200).json(await takeOutOfService(params.equipmentId));
}

export async function endSessionHandler(req: Request, res: Response) {
  const user = requireUser(req);
  res.status(200).json(await endSession(user.id));
}
