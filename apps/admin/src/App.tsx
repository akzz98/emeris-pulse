import { useState } from "react";
import type { AppNavItem } from "@emeris/ui";
import { AccessLogScreen } from "./AccessLogScreen";
import { DashboardScreen } from "./DashboardScreen";
import { LoginScreen } from "./LoginScreen";
import { ScanScreen } from "./ScanScreen";
import { TemporaryPassScreen } from "./TemporaryPassScreen";
import { clearSession, loadSession, saveSession } from "./session";
import type { AdminSession } from "./api";

type AdminScreen = "dashboard" | "scan" | "logs" | "temporary";

function adminNav(current: AdminScreen, onSelect: (screen: AdminScreen) => void, role: string): AppNavItem[] {
  const dashboard: AppNavItem = {
    label: "Dashboard",
    current: current === "dashboard",
    onSelect: () => onSelect("dashboard"),
  };
  // The facility manager watches crowding. Desk actions stay with the gym administrator.
  if (role === "FacilityManager") {
    return [dashboard];
  }
  return [
    dashboard,
    { label: "Scan entry", current: current === "scan", onSelect: () => onSelect("scan") },
    { label: "Access logs", current: current === "logs", onSelect: () => onSelect("logs") },
    { label: "Temporary pass", current: current === "temporary", onSelect: () => onSelect("temporary") },
  ];
}

export function App() {
  const [session, setSession] = useState<AdminSession | null>(() => loadSession());
  const [screen, setScreen] = useState<AdminScreen>(
    () => (loadSession()?.user.role === "FacilityManager" ? "dashboard" : "logs"),
  );

  if (!session) {
    return (
      <LoginScreen
        onSignedIn={(next) => {
          saveSession(next);
          setSession(next);
          setScreen(next.user.role === "FacilityManager" ? "dashboard" : "logs");
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
    return <DashboardScreen session={session} nav={nav} onSignOut={onSignOut} />;
  }

  if (screen === "temporary") {
    return <TemporaryPassScreen session={session} nav={nav} onSignOut={onSignOut} />;
  }

  if (screen === "scan") {
    return <ScanScreen nav={nav} onSignOut={onSignOut} />;
  }

  return <AccessLogScreen session={session} nav={nav} onSignOut={onSignOut} />;
}
