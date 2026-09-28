import type { Request, Response } from "express";
import { requireUser } from "../../http/authenticate.js";
import { challengeIdParams } from "./wellnessSchemas.js";
import { joinChallenge, listChallenges } from "./wellnessService.js";

export async function listChallengesHandler(req: Request, res: Response) {
  const user = requireUser(req);
  res.status(200).json(await listChallenges(user.id));
}

export async function joinChallengeHandler(req: Request, res: Response) {
  const user = requireUser(req);
  const params = challengeIdParams.parse(res.locals.params);
  res.status(201).json(await joinChallenge(user.id, params.challengeId));
}
