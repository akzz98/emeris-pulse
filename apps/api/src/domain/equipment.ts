import { DomainError } from "./domainError.js";

export type EquipmentStatus = "Available" | "OutOfService";

export class Equipment {
  constructor(readonly status: EquipmentStatus) {}

  takeOutOfService(): EquipmentStatus {
    if (this.status === "OutOfService") {
      throw new DomainError("This machine is already out of service.");
    }
    return "OutOfService";
  }

  // Closing the last open ticket puts the machine back on the floor.
  returnToService(): EquipmentStatus {
    if (this.status === "Available") {
      throw new DomainError("This machine is already in service.");
    }
    return "Available";
  }
}
