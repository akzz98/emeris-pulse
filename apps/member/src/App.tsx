import { useEffect, useState } from "react";
import { AccessScreen } from "./AccessScreen";
import { ClassesScreen } from "./ClassesScreen";
import { EquipmentScreen } from "./EquipmentScreen";
import { HomeScreen } from "./HomeScreen";
import { LoginScreen } from "./LoginScreen";
import { MembershipScreen } from "./MembershipScreen";
import { NotificationsScreen } from "./NotificationsScreen";
import { ProfileScreen } from "./ProfileScreen";
import { RegisterScreen } from "./RegisterScreen";
import { WellnessScreen } from "./WellnessScreen";
import { getMyNotices } from "./api";
import { memberNav, type MemberScreen } from "./navigation";
import { clearSession, loadSession, saveSession, type MemberSession } from "./session";
import { Splash } from "./Splash";

export function App() {
  const [session, setSession] = useState<MemberSession | null>(() => loadSession());
  const [showSplash, setShowSplash] = useState(true);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [screen, setScreen] = useState<MemberScreen>("home");
  const [noticeCount, setNoticeCount] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowSplash(false), 900);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!session) {
      setNoticeCount(0);
      return;
    }
    let active = true;
    getMyNotices(session.accessToken)
      .then((next) => {
        if (active) {
          setNoticeCount(next.notices.filter((item) => !item.read).length);
        }
      })
      .catch(() => {
        if (active) {
          setNoticeCount(0);
        }
      });
    return () => {
      active = false;
    };
  }, [session, screen]);

  if (showSplash) {
    return <Splash />;
  }

  if (!session) {
    const onSignedIn = (next: MemberSession) => {
      saveSession(next);
      setSession(next);
    };
    if (mode === "register") {
      return <RegisterScreen onSignedIn={onSignedIn} onSignIn={() => setMode("login")} />;
    }
    return <LoginScreen onSignedIn={onSignedIn} onCreateAccount={() => setMode("register")} />;
  }

  const onSignOut = () => {
    clearSession();
    setSession(null);
    setScreen("home");
  };
  const nav = memberNav(screen, setScreen, { noticeCount });

  if (screen === "membership") {
    return <MembershipScreen session={session} nav={nav} onSignOut={onSignOut} />;
  }

  if (screen === "access") {
    return <AccessScreen session={session} nav={nav} onSignOut={onSignOut} />;
  }

  if (screen === "classes") {
    return <ClassesScreen session={session} nav={nav} onSignOut={onSignOut} />;
  }

  if (screen === "equipment") {
    return <EquipmentScreen session={session} nav={nav} onSignOut={onSignOut} />;
  }

  if (screen === "wellness") {
    return <WellnessScreen session={session} nav={nav} onSignOut={onSignOut} />;
  }

  if (screen === "notices") {
    return <NotificationsScreen session={session} nav={nav} onSignOut={onSignOut} />;
  }

  if (screen === "profile") {
    return (
      <ProfileScreen
        session={session}
        nav={nav}
        onSignOut={onSignOut}
        onUpdated={(profile) => {
          const next = {
            ...session,
            user: { ...session.user, firstName: profile.firstName, lastName: profile.lastName },
          };
          saveSession(next);
          setSession(next);
        }}
      />
    );
  }

  return <HomeScreen session={session} nav={nav} onSignOut={onSignOut} onNavigate={setScreen} />;
}
