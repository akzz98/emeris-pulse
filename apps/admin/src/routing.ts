import type { AdminScreen } from "./screens";

const ADMIN_SCREENS: AdminScreen[] = [
  "dashboard",
  "scan",
  "logs",
  "members",
  "roles",
  "temporary",
  "timetable",
  "maintenance",
  "challenges",
  "broadcast",
  "reports",
];

const FACILITY_SCREENS: AdminScreen[] = ["dashboard", "reports", "maintenance"];

export function adminScreenPath(screen: AdminScreen): string {
  return screen === "dashboard" ? "/" : `/${screen}`;
}

export function parseAdminScreen(pathname: string, role: string): AdminScreen {
  const clean = pathname.replace(/\/+$/, "") || "/";
  if (clean === "/" || clean === "" || clean === "/dashboard" || clean === "/login") {
    return "dashboard";
  }
  const id = clean.slice(1).split("/")[0] ?? "";
  if (!ADMIN_SCREENS.includes(id as AdminScreen)) {
    return "dashboard";
  }
  const screen = id as AdminScreen;
  if (role === "FacilityManager" && !FACILITY_SCREENS.includes(screen)) {
    return "dashboard";
  }
  if (screen === "roles" && role !== "SystemAdmin") {
    return "dashboard";
  }
  return screen;
}

export function allowedAdminScreen(screen: AdminScreen, role: string): AdminScreen {
  if (role === "FacilityManager" && !FACILITY_SCREENS.includes(screen)) {
    return "dashboard";
  }
  if (screen === "roles" && role !== "SystemAdmin") {
    return "dashboard";
  }
  return screen;
}
