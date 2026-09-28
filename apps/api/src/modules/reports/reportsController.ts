import type { Request, Response } from "express";
import { classFillReport, equipmentDowntimeReport, wellnessParticipationReport } from "./reportsService.js";

export async function classFillHandler(_req: Request, res: Response) {
  res.status(200).json(await classFillReport());
}

export async function equipmentDowntimeHandler(_req: Request, res: Response) {
  res.status(200).json(await equipmentDowntimeReport());
}

export async function wellnessParticipationHandler(_req: Request, res: Response) {
  res.status(200).json(await wellnessParticipationReport());
}
