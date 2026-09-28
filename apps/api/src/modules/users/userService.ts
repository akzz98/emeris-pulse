import type { Role } from "../../domain/roles.js";
import { HttpError } from "../../http/httpError.js";
import type { ContactInput } from "../auth/authSchemas.js";
import { UserRepository } from "./userRepository.js";

const users = new UserRepository();

function publicUser(user: NonNullable<Awaited<ReturnType<UserRepository["findById"]>>>) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    campusIdentifier: user.campusIdentifier,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
  };
}

export async function updateMyContact(userId: number, input: ContactInput) {
  const user = await users.findById(userId);
  if (!user) {
    throw new HttpError(404, "USER_NOT_FOUND", "Account not found.");
  }
  const next = {
    firstName: input.firstName ?? user.firstName,
    lastName: input.lastName ?? user.lastName,
    phone: input.phone === undefined ? user.phone : input.phone,
  };
  await users.updateProfile(userId, next);
  return publicUser({ ...user, ...next });
}

export async function assignRole(actorId: number, targetId: number, role: Role) {
  if (actorId === targetId) {
    throw new HttpError(409, "INVALID_STATE", "You cannot change your own role.");
  }
  const updated = await users.updateRole(targetId, role);
  if (!updated) {
    throw new HttpError(404, "USER_NOT_FOUND", "Account not found.");
  }
  const user = await users.findById(targetId);
  if (!user) {
    throw new HttpError(404, "USER_NOT_FOUND", "Account not found.");
  }
  return publicUser(user);
}
