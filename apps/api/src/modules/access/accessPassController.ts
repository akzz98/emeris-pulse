import type { Request, Response } from "express";
import { requireUser } from "../../http/authenticate.js";
import { issueStandardPass } from "./accessPassService.js";

export async function issuePassHandler(req: Request, res: Response) {
  const user = requireUser(req);
  res.status(201).json(await issueStandardPass(user.id));
}
