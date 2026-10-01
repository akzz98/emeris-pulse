import { useCallback, useState } from "react";
import { useHistoryPath, type AppNavItem } from "@emeris/ui";
import { ClassDetailScreen } from "./ClassDetailScreen";
import { LoginScreen } from "./LoginScreen";
import { StudioEquipmentScreen } from "./StudioEquipmentScreen";
import { TodayScreen } from "./TodayScreen";
import { instructorRoutePath, parseInstructorRoute, type InstructorRoute } from "./routing";
import { clearSession, loadSession, saveSession } from "./session";
import type { InstructorSession } from "./api";

function instructorNav(route: InstructorRoute, go: (next: InstructorRoute) => void): AppNavItem[] {
  return [
    {
      label: "Today",
      current: route.screen === "today" || route.screen === "detail",
      onSelect: () => go({ screen: "today" }),
    },
    {
      label: "Studio equipment",
      current: route.screen === "studio",
      onSelect: () => go({ screen: "studio" }),
    },
  ];
}

export function App() {
  const [session, setSession] = useState<InstructorSession | null>(() => loadSession());
  const parse = useCallback((pathname: string) => parseInstructorRoute(pathname), []);
  const pathFor = useCallback((route: InstructorRoute) => instructorRoutePath(route), []);
  const [route, navigate] = useHistoryPath(parse, pathFor);

  if (!session) {
    return (
      <LoginScreen
        onSignedIn={(next) => {
          saveSession(next);
          setSession(next);
          navigate({ screen: "today" }, { replace: true });
        }}
      />
    );
  }

  const onSignOut = () => {
    clearSession();
    setSession(null);
    navigate({ screen: "today" }, { replace: true });
  };
  const nav = instructorNav(route, navigate);

  if (route.screen === "studio") {
    return <StudioEquipmentScreen session={session} nav={nav} onSignOut={onSignOut} />;
  }

  if (route.screen === "detail") {
    return (
      <ClassDetailScreen
        session={session}
        nav={nav}
        classId={route.classId}
        onSignOut={onSignOut}
        onBack={() => navigate({ screen: "today" })}
      />
    );
  }

  return (
    <TodayScreen
      session={session}
      nav={nav}
      onSignOut={onSignOut}
      onOpenClass={(classId) => navigate({ screen: "detail", classId })}
    />
  );
}
