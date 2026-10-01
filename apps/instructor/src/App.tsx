import { useState } from "react";
import type { AppNavItem } from "@emeris/ui";
import { ClassDetailScreen } from "./ClassDetailScreen";
import { LoginScreen } from "./LoginScreen";
import { StudioEquipmentScreen } from "./StudioEquipmentScreen";
import { TodayScreen } from "./TodayScreen";
import { clearSession, loadSession, saveSession } from "./session";
import type { InstructorSession } from "./api";

type InstructorScreen = "today" | "studio" | "detail";

function instructorNav(
  current: InstructorScreen,
  onSelect: (screen: InstructorScreen) => void,
  clearDetail: () => void,
): AppNavItem[] {
  return [
    {
      label: "Today",
      current: current === "today" || current === "detail",
      onSelect: () => {
        clearDetail();
        onSelect("today");
      },
    },
    {
      label: "Studio equipment",
      current: current === "studio",
      onSelect: () => {
        clearDetail();
        onSelect("studio");
      },
    },
  ];
}

export function App() {
  const [session, setSession] = useState<InstructorSession | null>(() => loadSession());
  const [screen, setScreen] = useState<InstructorScreen>("today");
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);

  if (!session) {
    return (
      <LoginScreen
        onSignedIn={(next) => {
          saveSession(next);
          setSession(next);
          setScreen("today");
          setSelectedClassId(null);
        }}
      />
    );
  }

  const onSignOut = () => {
    clearSession();
    setSession(null);
    setSelectedClassId(null);
  };
  const clearDetail = () => setSelectedClassId(null);
  const nav = instructorNav(screen, setScreen, clearDetail);

  if (screen === "studio") {
    return <StudioEquipmentScreen session={session} nav={nav} onSignOut={onSignOut} />;
  }

  if (screen === "detail" && selectedClassId !== null) {
    return (
      <ClassDetailScreen
        session={session}
        nav={nav}
        classId={selectedClassId}
        onSignOut={onSignOut}
        onBack={() => {
          setSelectedClassId(null);
          setScreen("today");
        }}
      />
    );
  }

  return (
    <TodayScreen
      session={session}
      nav={nav}
      onSignOut={onSignOut}
      onOpenClass={(classId) => {
        setSelectedClassId(classId);
        setScreen("detail");
      }}
    />
  );
}
