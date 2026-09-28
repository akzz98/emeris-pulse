import type { Request, Response } from "express";
import { requireUser } from "../../http/authenticate.js";
import { attendanceSchema, classIdParams, publishClassSchema } from "./classSchemas.js";
import {
  bookClass,
  cancelBooking,
  cancelClass,
  getAttendance,
  getAttendanceTrends,
  getInstructorClasses,
  getRoster,
  getTimetable,
  listManagedClasses,
  publishClass,
  recordAttendance,
  updateClass,
} from "./classService.js";

export async function timetableHandler(req: Request, res: Response) {
  const user = requireUser(req);
  res.status(200).json(await getTimetable(user.id));
}

export async function rosterHandler(req: Request, res: Response) {
  const user = requireUser(req);
  res.status(200).json(await getRoster(user.id));
}

export async function attendanceHandler(req: Request, res: Response) {
  const user = requireUser(req);
  res.status(200).json(await getAttendance(user.id));
}

export async function trendsHandler(req: Request, res: Response) {
  const user = requireUser(req);
  res.status(200).json(await getAttendanceTrends(user.id));
}

export async function instructorClassesHandler(req: Request, res: Response) {
  const user = requireUser(req);
  res.status(200).json(await getInstructorClasses(user.id));
}

export async function recordAttendanceHandler(req: Request, res: Response) {
  const user = requireUser(req);
  const params = classIdParams.parse(res.locals.params);
  const body = attendanceSchema.parse(req.body);
  res.status(200).json(await recordAttendance(user.id, params.classId, body));
}

export async function cancelClassHandler(req: Request, res: Response) {
  const user = requireUser(req);
  const params = classIdParams.parse(res.locals.params);
  res.status(200).json(await cancelClass(user.id, params.classId));
}

export async function managedClassesHandler(_req: Request, res: Response) {
  res.status(200).json(await listManagedClasses());
}

export async function publishClassHandler(req: Request, res: Response) {
  const body = publishClassSchema.parse(req.body);
  res.status(201).json(await publishClass(body));
}

export async function updateClassHandler(req: Request, res: Response) {
  const params = classIdParams.parse(res.locals.params);
  const body = publishClassSchema.parse(req.body);
  res.status(200).json(await updateClass(params.classId, body));
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
