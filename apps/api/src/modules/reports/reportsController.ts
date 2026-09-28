import type { Request, Response } from "express";
import { classFillReport, equipmentDowntimeReport, wellnessParticipationReport } from "./reportsService.js";
import { reportPageSchema } from "./reportsSchemas.js";

export async function classFillHandler(_req: Request, res: Response) {
  const query = reportPageSchema.parse(res.locals.query);
  res.status(200).json(await classFillReport(query.page, query.pageSize));
}

export async function equipmentDowntimeHandler(_req: Request, res: Response) {
  const query = reportPageSchema.parse(res.locals.query);
  res.status(200).json(await equipmentDowntimeReport(query.page, query.pageSize));
}

export async function wellnessParticipationHandler(_req: Request, res: Response) {
  const query = reportPageSchema.parse(res.locals.query);
  res.status(200).json(await wellnessParticipationReport(query.page, query.pageSize));
}
