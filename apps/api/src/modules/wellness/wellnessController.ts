import type { Request, Response } from "express";
import { requireUser } from "../../http/authenticate.js";
import { challengeIdParams, createChallengeSchema } from "./wellnessSchemas.js";
import { createChallenge, joinChallenge, listChallenges, listManagedChallenges } from "./wellnessService.js";

export async function managedChallengesHandler(_req: Request, res: Response) {
  res.status(200).json(await listManagedChallenges());
}

export async function createChallengeHandler(req: Request, res: Response) {
  const user = requireUser(req);
  const body = createChallengeSchema.parse(req.body);
  res.status(201).json(await createChallenge(user.id, body));
}

export async function listChallengesHandler(req: Request, res: Response) {
  const user = requireUser(req);
  res.status(200).json(await listChallenges(user.id));
}

export async function joinChallengeHandler(req: Request, res: Response) {
  const user = requireUser(req);
  const params = challengeIdParams.parse(res.locals.params);
  res.status(201).json(await joinChallenge(user.id, params.challengeId));
}
