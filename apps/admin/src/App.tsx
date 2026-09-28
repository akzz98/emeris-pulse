import { useState } from "react";
import type { AppNavItem } from "@emeris/ui";
import { AccessLogScreen } from "./AccessLogScreen";
import { LoginScreen } from "./LoginScreen";
import { ScanScreen } from "./ScanScreen";
import { TemporaryPassScreen } from "./TemporaryPassScreen";
import { clearSession, loadSession, saveSession } from "./session";
import type { AdminSession } from "./api";

type AdminScreen = "scan" | "logs" | "temporary";

function adminNav(current: AdminScreen, onSelect: (screen: AdminScreen) => void): AppNavItem[] {
  return [
    { label: "Scan entry", current: current === "scan", onSelect: () => onSelect("scan") },
    { label: "Access logs", current: current === "logs", onSelect: () => onSelect("logs") },
    { label: "Temporary pass", current: current === "temporary", onSelect: () => onSelect("temporary") },
  ];
}

export function App() {
  const [session, setSession] = useState<AdminSession | null>(() => loadSession());
  const [screen, setScreen] = useState<AdminScreen>("logs");

  if (!session) {
    return (
      <LoginScreen
        onSignedIn={(next) => {
          saveSession(next);
          setSession(next);
          setScreen("logs");
        }}
      />
    );
  }

  const onSignOut = () => {
    clearSession();
    setSession(null);
  };
  const nav = adminNav(screen, setScreen);

  if (screen === "temporary") {
    return <TemporaryPassScreen session={session} nav={nav} onSignOut={onSignOut} />;
  }

  if (screen === "scan") {
    return <ScanScreen nav={nav} onSignOut={onSignOut} />;
  }

  return <AccessLogScreen session={session} nav={nav} onSignOut={onSignOut} />;
}
