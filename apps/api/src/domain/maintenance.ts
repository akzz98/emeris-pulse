import { DomainError } from "./domainError.js";

export type TicketStatus = "Open" | "InProgress" | "Closed";

export class MaintenanceTicket {
  constructor(readonly status: TicketStatus) {}

  // A member or instructor report starts the ticket as open. Later steps move it on.
  static report(): TicketStatus {
    return "Open";
  }

  start(): TicketStatus {
    if (this.status !== "Open") {
      throw new DomainError("Only an open ticket can be started.");
    }
    return "InProgress";
  }

  close(): TicketStatus {
    if (this.status === "Closed") {
      throw new DomainError("This ticket is already closed.");
    }
    return "Closed";
  }
}
