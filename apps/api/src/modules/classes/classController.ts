import type { Request, Response } from "express";
import { requireUser } from "../../http/authenticate.js";
import { classIdParams } from "./classSchemas.js";
import { bookClass, cancelBooking, getTimetable } from "./classService.js";

export async function timetableHandler(req: Request, res: Response) {
  const user = requireUser(req);
  res.status(200).json(await getTimetable(user.id));
}

export async function bookClassHandler(req: Request, res: Response) {
  const user = requireUser(req);
  const params = classIdParams.parse(res.locals.params);
  res.status(201).json(await bookClass(user.id, params.classId));
}

export async function cancelBookingHandler(req: Request, res: Response) {
  const user = requireUser(req);
  const params = classIdParams.parse(res.locals.params);
  res.status(200).json(await cancelBooking(user.id, params.classId));
}
