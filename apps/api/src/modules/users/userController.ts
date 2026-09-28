import type { Request, Response } from "express";
import { requireUser } from "../../http/authenticate.js";
import { contactSchema, roleSchema, userIdParams } from "../auth/authSchemas.js";
import { assignRole, updateMyContact } from "./userService.js";

export async function updateContactHandler(req: Request, res: Response) {
  const user = requireUser(req);
  const body = contactSchema.parse(req.body);
  res.status(200).json(await updateMyContact(user.id, body));
}

export async function assignRoleHandler(req: Request, res: Response) {
  const actor = requireUser(req);
  const params = userIdParams.parse(res.locals.params);
  const body = roleSchema.parse(req.body);
  res.status(200).json(await assignRole(actor.id, params.userId, body.role));
}
