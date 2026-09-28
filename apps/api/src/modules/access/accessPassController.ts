import type { Request, Response } from "express";
import { requireUser } from "../../http/authenticate.js";
import { accessLogQuerySchema, redeemPassSchema } from "./accessPassSchemas.js";
import { issueStandardPass, listAccessLog, redeemPass } from "./accessPassService.js";

export async function issuePassHandler(req: Request, res: Response) {
  const user = requireUser(req);
  res.status(201).json(await issueStandardPass(user.id));
}

export async function redeemPassHandler(req: Request, res: Response) {
  const body = redeemPassSchema.parse(req.body);
  res.status(200).json(await redeemPass(body));
}

export async function listAccessLogHandler(_req: Request, res: Response) {
  const query = accessLogQuerySchema.parse(res.locals.query);
  res.status(200).json(await listAccessLog(query));
}
