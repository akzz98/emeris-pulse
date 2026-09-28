import { useState } from "react";
import type { AppNavItem } from "@emeris/ui";
import { LoginScreen } from "./LoginScreen";
import { RosterScreen } from "./RosterScreen";
import { clearSession, loadSession, saveSession } from "./session";
import type { InstructorSession } from "./api";

function instructorNav(onSelect: () => void): AppNavItem[] {
  return [{ label: "My classes", current: true, onSelect }];
}

export function App() {
  const [session, setSession] = useState<InstructorSession | null>(() => loadSession());

  if (!session) {
    return (
      <LoginScreen
        onSignedIn={(next) => {
          saveSession(next);
          setSession(next);
        }}
      />
    );
  }

  const onSignOut = () => {
    clearSession();
    setSession(null);
  };

  return <RosterScreen session={session} nav={instructorNav(() => undefined)} onSignOut={onSignOut} />;
}
