import type { Request, Response } from "express";
import { requireUser } from "../../http/authenticate.js";
import { accessLogQuerySchema, passJtiParams, redeemPassSchema, temporaryPassSchema } from "./accessPassSchemas.js";
import {
  getMyPassStatus,
  getOccupancy,
  getUtilisation,
  issueStandardPass,
  issueTemporaryPass,
  listAccessLog,
  redeemPass,
} from "./accessPassService.js";

export async function issuePassHandler(req: Request, res: Response) {
  const user = requireUser(req);
  res.status(201).json(await issueStandardPass(user.id));
}

export async function passStatusHandler(req: Request, res: Response) {
  const user = requireUser(req);
  const params = passJtiParams.parse(res.locals.params);
  res.status(200).json(await getMyPassStatus(user.id, params.jti));
}

export async function redeemPassHandler(req: Request, res: Response) {
  const body = redeemPassSchema.parse(req.body);
  res.status(200).json(await redeemPass(body));
}

export async function listAccessLogHandler(_req: Request, res: Response) {
  const query = accessLogQuerySchema.parse(res.locals.query);
  res.status(200).json(await listAccessLog(query));
}

export async function utilisationHandler(_req: Request, res: Response) {
  res.status(200).json(await getUtilisation());
}

export async function occupancyHandler(_req: Request, res: Response) {
  res.status(200).json(await getOccupancy());
}

export async function issueTemporaryPassHandler(req: Request, res: Response) {
  const body = temporaryPassSchema.parse(req.body);
  res.status(201).json(await issueTemporaryPass(body));
}
