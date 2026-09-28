import { DomainError } from "./domainError.js";

export type MembershipStatus = "Pending" | "Active" | "Frozen" | "Expired";
export type MemberType = "Student" | "Staff";

export class Membership {
  constructor(
    readonly status: MembershipStatus,
    readonly memberType: MemberType,
    readonly expiryDate: string,
  ) {}

  static termDays(memberType: MemberType): number {
    return memberType === "Staff" ? 365 : 120;
  }

  canEnter(today: string): boolean {
    return this.status === "Active" && this.expiryDate >= today;
  }

  activate(today: string): MembershipStatus {
    if (this.status !== "Pending" && this.status !== "Frozen") {
      throw new DomainError("Only a pending or frozen membership can be activated.");
    }
    if (this.expiryDate < today) {
      throw new DomainError("Extend the expiry date before activating a lapsed membership.");
    }
    return "Active";
  }

  freeze(): MembershipStatus {
    if (this.status !== "Active") {
      throw new DomainError("Only an active membership can be frozen.");
    }
    return "Frozen";
  }

  expireIfLapsed(today: string): MembershipStatus {
    if (this.status === "Active" && this.expiryDate < today) {
      return "Expired";
    }
    return this.status;
  }
}
