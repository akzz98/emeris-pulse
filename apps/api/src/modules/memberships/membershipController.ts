import type { Request, Response } from "express";
import { requireUser } from "../../http/authenticate.js";
import { userIdParams } from "../auth/authSchemas.js";
import { activateMembership, freezeMembership, getMyMembership } from "./membershipService.js";

export async function getMyMembershipHandler(req: Request, res: Response) {
  const user = requireUser(req);
  res.status(200).json(await getMyMembership(user.id));
}

export async function activateMembershipHandler(req: Request, res: Response) {
  const params = userIdParams.parse(res.locals.params);
  res.status(200).json(await activateMembership(params.userId));
}

export async function freezeMembershipHandler(req: Request, res: Response) {
  const params = userIdParams.parse(res.locals.params);
  res.status(200).json(await freezeMembership(params.userId));
}
