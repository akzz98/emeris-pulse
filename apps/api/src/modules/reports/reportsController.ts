import type { Request, Response } from "express";
import { classFillReport, equipmentDowntimeReport } from "./reportsService.js";

export async function classFillHandler(_req: Request, res: Response) {
  res.status(200).json(await classFillReport());
}

export async function equipmentDowntimeHandler(_req: Request, res: Response) {
  res.status(200).json(await equipmentDowntimeReport());
}
