import { useState } from "react";
import type { AppNavItem } from "@emeris/ui";
import { AttendanceScreen } from "./AttendanceScreen";
import { ClassDetailsScreen } from "./ClassDetailsScreen";
import { LoginScreen } from "./LoginScreen";
import { RosterScreen } from "./RosterScreen";
import { StudioEquipmentScreen } from "./StudioEquipmentScreen";
import { clearSession, loadSession, saveSession } from "./session";
import type { InstructorSession } from "./api";

type InstructorScreen = "classes" | "attendance" | "details" | "studio";

function instructorNav(current: InstructorScreen, onSelect: (screen: InstructorScreen) => void): AppNavItem[] {
  return [
    { label: "My classes", current: current === "classes", onSelect: () => onSelect("classes") },
    { label: "Attendance", current: current === "attendance", onSelect: () => onSelect("attendance") },
    { label: "Class details", current: current === "details", onSelect: () => onSelect("details") },
    { label: "Studio equipment", current: current === "studio", onSelect: () => onSelect("studio") },
  ];
}

export function App() {
  const [session, setSession] = useState<InstructorSession | null>(() => loadSession());
  const [screen, setScreen] = useState<InstructorScreen>("classes");

  if (!session) {
    return (
      <LoginScreen
        onSignedIn={(next) => {
          saveSession(next);
          setSession(next);
          setScreen("classes");
        }}
      />
    );
  }

  const onSignOut = () => {
    clearSession();
    setSession(null);
  };
  const nav = instructorNav(screen, setScreen);

  if (screen === "attendance") {
    return <AttendanceScreen session={session} nav={nav} onSignOut={onSignOut} />;
  }
  if (screen === "details") {
    return <ClassDetailsScreen session={session} nav={nav} onSignOut={onSignOut} />;
  }
  if (screen === "studio") {
    return <StudioEquipmentScreen session={session} nav={nav} onSignOut={onSignOut} />;
  }
  return <RosterScreen session={session} nav={nav} onSignOut={onSignOut} />;
}
