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
import { ChallengesScreen } from "./ChallengesScreen";
import { getMyNotices } from "./api";
import { memberNav } from "./navigation";
import { parseMemberRoute, useMemberRoute } from "./routing";
import { clearSession, loadSession, saveSession, type MemberSession } from "./session";
import { Splash } from "./Splash";

export function App() {
  const [session, setSession] = useState<MemberSession | null>(() => loadSession());
  // Returning members skip the brand splash and land on Home.
  const [showSplash, setShowSplash] = useState(() => loadSession() === null);
  const { route, navigate, goScreen, goAuth } = useMemberRoute(session !== null);
  const [noticeCount, setNoticeCount] = useState(0);
  const screen = route.area === "app" ? route.screen : "home";

  useEffect(() => {
    if (!showSplash) {
      return;
    }
    const timer = window.setTimeout(() => setShowSplash(false), 900);
    return () => window.clearTimeout(timer);
  }, [showSplash]);

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
      const pending = parseMemberRoute(window.location.pathname);
      navigate(
        pending.area === "app" ? pending : { area: "app", screen: "home" },
        { replace: true },
      );
    };
    if (route.area === "auth" && route.mode === "register") {
      return <RegisterScreen onSignedIn={onSignedIn} onSignIn={() => goAuth("login")} />;
    }
    return <LoginScreen onSignedIn={onSignedIn} onCreateAccount={() => goAuth("register")} />;
  }

  const onSignOut = () => {
    clearSession();
    setSession(null);
    navigate({ area: "auth", mode: "login" }, { replace: true });
  };
  const nav = memberNav(screen, goScreen, { noticeCount });

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

  if (screen === "challenges") {
    return <ChallengesScreen session={session} nav={nav} onSignOut={onSignOut} />;
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

  return <HomeScreen session={session} nav={nav} onSignOut={onSignOut} onNavigate={goScreen} />;
}
