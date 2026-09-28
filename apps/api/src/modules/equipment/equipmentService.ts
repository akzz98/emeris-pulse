import sql from "mssql";
import { Equipment } from "../../domain/equipment.js";
import { MaintenanceTicket } from "../../domain/maintenance.js";
import { getPool } from "../../db/pool.js";
import { HttpError } from "../../http/httpError.js";
import { getMyMembership } from "../memberships/membershipService.js";
import { EquipmentRepository } from "./equipmentRepository.js";

const equipment = new EquipmentRepository();

async function requireActiveMember(userId: number): Promise<void> {
  const membership = await getMyMembership(userId);
  if (!membership.canEnter) {
    throw new HttpError(403, "MEMBERSHIP_INACTIVE", "An active membership is required to use equipment.");
  }
}

export async function listEquipment() {
  const items = await equipment.list();
  return { equipment: items };
}

export async function currentSession(userId: number) {
  return { session: await equipment.openSessionForUser(userId) };
}

// A session starts only for an active member, on a free machine that is in service.
export async function startSession(userId: number, code: string) {
  await requireActiveMember(userId);
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  await transaction.begin();
  try {
    const machine = await equipment.lockByCode(transaction, code);
    if (!machine) {
      throw new HttpError(404, "EQUIPMENT_NOT_FOUND", "That machine code is not on the floor.");
    }
    if (machine.status !== "Available") {
      throw new HttpError(409, "EQUIPMENT_OUT_OF_SERVICE", "This machine is out of service.");
    }

    const mine = await equipment.lockOpenForUser(transaction, userId);
    if (mine) {
      throw new HttpError(409, "SESSION_ALREADY_OPEN", "End your current session before starting another machine.");
    }

    const busy = await equipment.lockOpenForEquipment(transaction, machine.id);
    if (busy) {
      throw new HttpError(409, "EQUIPMENT_IN_USE", "Someone is already using this machine.");
    }

    const session = await equipment.insertSession(transaction, machine, userId);
    await transaction.commit();
    return session;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

// The fault is for the machine in the current session. A second open ticket is refused.
export async function reportFault(userId: number, description: string) {
  await requireActiveMember(userId);
  const session = await equipment.openSessionForUser(userId);
  if (!session) {
    throw new HttpError(404, "SESSION_NOT_FOUND", "Start a session on the machine before reporting a fault.");
  }
  const alreadyOpen = await equipment.openTicketForEquipment(session.equipmentId);
  if (alreadyOpen) {
    throw new HttpError(409, "TICKET_ALREADY_OPEN", "A ticket is already open for this machine.");
  }
  const status = MaintenanceTicket.report();
  const ticket = await equipment.insertTicket(session.equipmentId, userId, description, status);
  return {
    id: ticket.id,
    equipmentId: session.equipmentId,
    code: session.code,
    name: session.name,
    status,
    description,
  };
}

// An instructor can flag studio kit without starting a member session. Floor machines stay on the member path.
export async function listStudioEquipment() {
  return { equipment: await equipment.listInStudio() };
}

export async function reportUnsafeStudio(userId: number, code: string, description: string) {
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  await transaction.begin();
  try {
    const machine = await equipment.lockByCode(transaction, code);
    if (!machine) {
      throw new HttpError(404, "EQUIPMENT_NOT_FOUND", "That machine code is not on the floor.");
    }
    if (!machine.location.startsWith("Studio")) {
      throw new HttpError(409, "NOT_STUDIO_EQUIPMENT", "Only studio equipment can be reported here.");
    }
    const alreadyOpen = await equipment.lockOpenTicket(transaction, machine.id);
    if (alreadyOpen) {
      throw new HttpError(409, "TICKET_ALREADY_OPEN", "A ticket is already open for this machine.");
    }
    const status = MaintenanceTicket.report();
    const ticket = await equipment.insertTicket(machine.id, userId, description, status, transaction);
    await transaction.commit();
    return {
      id: ticket.id,
      equipmentId: machine.id,
      code: machine.code,
      name: machine.name,
      location: machine.location,
      status,
      description,
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

// The queue is tickets still being dealt with. Closed tickets stay off this list.
export async function listTicketQueue() {
  return { tickets: await equipment.listOpenTickets() };
}

export async function takeOutOfService(equipmentId: number) {
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  await transaction.begin();
  try {
    const machine = await equipment.lockById(transaction, equipmentId);
    if (!machine) {
      throw new HttpError(404, "EQUIPMENT_NOT_FOUND", "That machine is not on the floor.");
    }
    const status = new Equipment(machine.status).takeOutOfService();
    await equipment.setStatus(transaction, machine.id, status);
    await transaction.commit();
    return { id: machine.id, code: machine.code, name: machine.name, status };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

// Closing the last open ticket returns the machine. Another open fault keeps it off the floor.
export async function closeTicket(ticketId: number) {
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  await transaction.begin();
  try {
    const ticket = await equipment.lockTicket(transaction, ticketId);
    if (!ticket) {
      throw new HttpError(404, "TICKET_NOT_FOUND", "That ticket does not exist.");
    }
    const machine = await equipment.lockById(transaction, ticket.equipmentId);
    if (!machine) {
      throw new HttpError(404, "EQUIPMENT_NOT_FOUND", "That machine is not on the floor.");
    }

    const status = new MaintenanceTicket(ticket.status).close();
    await equipment.closeTicket(transaction, ticket.id, status);

    const others = await equipment.otherOpenTickets(transaction, machine.id, ticket.id);
    let equipmentStatus = machine.status;
    let returned = false;
    if (others === 0 && machine.status === "OutOfService") {
      equipmentStatus = new Equipment(machine.status).returnToService();
      await equipment.setStatus(transaction, machine.id, equipmentStatus);
      returned = true;
    }

    await transaction.commit();
    return {
      id: ticket.id,
      status,
      equipmentId: machine.id,
      code: machine.code,
      name: machine.name,
      equipmentStatus,
      returned,
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function endSession(userId: number) {
  const ended = await equipment.endOpenSession(userId);
  if (!ended) {
    throw new HttpError(404, "SESSION_NOT_FOUND", "You do not have an open equipment session.");
  }
  return { ended: true };
}
