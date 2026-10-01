import { useState } from "react";
import type { AppNavItem } from "@emeris/ui";
import { AccessLogScreen } from "./AccessLogScreen";
import { BroadcastScreen } from "./BroadcastScreen";
import { ChallengeScreen } from "./ChallengeScreen";
import { DashboardScreen } from "./DashboardScreen";
import { LoginScreen } from "./LoginScreen";
import { MembersScreen } from "./MembersScreen";
import { MaintenanceScreen } from "./MaintenanceScreen";
import { ReportsScreen } from "./ReportsScreen";
import { RolesScreen } from "./RolesScreen";
import { ScanScreen } from "./ScanScreen";
import { TemporaryPassScreen } from "./TemporaryPassScreen";
import { TimetableScreen } from "./TimetableScreen";
import { clearSession, loadSession, saveSession } from "./session";
import type { AdminSession } from "./api";

export type AdminScreen =
  | "dashboard"
  | "scan"
  | "logs"
  | "members"
  | "roles"
  | "temporary"
  | "timetable"
  | "maintenance"
  | "challenges"
  | "broadcast"
  | "reports";

function adminNav(current: AdminScreen, onSelect: (screen: AdminScreen) => void, role: string): AppNavItem[] {
  const link = (id: AdminScreen, label: string): AppNavItem => ({
    label,
    current: current === id,
    onSelect: () => onSelect(id),
  });
  const group = (label: string, children: AppNavItem[]): AppNavItem => ({
    label,
    current: children.some((child) => child.current),
    onSelect: () => undefined,
    children,
  });

  // The facility manager watches crowding, reports, and the ticket queue. Desk actions stay with the gym administrator.
  if (role === "FacilityManager") {
    return [link("dashboard", "Dashboard"), link("reports", "Reports"), link("maintenance", "Maintenance")];
  }

  return [
    link("dashboard", "Dashboard"),
    group("Desk", [link("scan", "Scan entry"), link("logs", "Access logs"), link("temporary", "Temporary pass")]),
    group("People", [
      link("members", "Members"),
      ...(role === "SystemAdmin" ? [link("roles", "Roles")] : []),
    ]),
    group("Schedule", [link("timetable", "Timetable")]),
    group("Facility", [link("maintenance", "Maintenance"), link("reports", "Reports")]),
    group("Comms", [link("challenges", "Challenges"), link("broadcast", "Broadcast")]),
  ];
}

function landingScreen(_role: string): AdminScreen {
  // GymAdmin and SystemAdmin land on the dashboard. Facility already did.
  return "dashboard";
}

export function App() {
  const [session, setSession] = useState<AdminSession | null>(() => loadSession());
  const [screen, setScreen] = useState<AdminScreen>(() =>
    loadSession() ? landingScreen(loadSession()!.user.role) : "dashboard",
  );

  if (!session) {
    return (
      <LoginScreen
        onSignedIn={(next) => {
          saveSession(next);
          setSession(next);
          setScreen(landingScreen(next.user.role));
        }}
      />
    );
  }

  const onSignOut = () => {
    clearSession();
    setSession(null);
  };
  const nav = adminNav(screen, setScreen, session.user.role);

  if (screen === "dashboard") {
    return <DashboardScreen session={session} nav={nav} onSignOut={onSignOut} onNavigate={setScreen} />;
  }

  if (screen === "reports") {
    return <ReportsScreen session={session} nav={nav} onSignOut={onSignOut} />;
  }

  if (screen === "maintenance") {
    return <MaintenanceScreen session={session} nav={nav} onSignOut={onSignOut} />;
  }

  if (screen === "timetable") {
    return <TimetableScreen session={session} nav={nav} onSignOut={onSignOut} />;
  }

  if (screen === "challenges") {
    return <ChallengeScreen session={session} nav={nav} onSignOut={onSignOut} />;
  }

  if (screen === "broadcast") {
    return <BroadcastScreen session={session} nav={nav} onSignOut={onSignOut} />;
  }

  if (screen === "members") {
    return <MembersScreen session={session} nav={nav} onSignOut={onSignOut} />;
  }

  if (screen === "roles" && session.user.role === "SystemAdmin") {
    return <RolesScreen session={session} nav={nav} onSignOut={onSignOut} />;
  }

  if (screen === "temporary") {
    return <TemporaryPassScreen session={session} nav={nav} onSignOut={onSignOut} />;
  }

  if (screen === "scan") {
    return <ScanScreen nav={nav} onSignOut={onSignOut} />;
  }

  return <AccessLogScreen session={session} nav={nav} onSignOut={onSignOut} />;
}
