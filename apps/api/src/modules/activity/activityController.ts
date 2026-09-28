import type { Request, Response } from "express";
import { requireUser } from "../../http/authenticate.js";
import { getMyActivity } from "./activityService.js";

export async function getMyActivityHandler(req: Request, res: Response) {
  const user = requireUser(req);
  res.status(200).json(await getMyActivity(user.id));
}
