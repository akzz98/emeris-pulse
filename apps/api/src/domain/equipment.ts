import { DomainError } from "./domainError.js";

export type EquipmentStatus = "Available" | "OutOfService";

export class Equipment {
  constructor(readonly status: EquipmentStatus) {}

  // A facility manager pulls a machine off the floor. Returning it is a later step.
  takeOutOfService(): EquipmentStatus {
    if (this.status === "OutOfService") {
      throw new DomainError("This machine is already out of service.");
    }
    return "OutOfService";
  }
}
