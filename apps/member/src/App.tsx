import { useEffect, useState } from "react";
import { HomeScreen } from "./HomeScreen";
import { LoginScreen } from "./LoginScreen";
import { MembershipScreen } from "./MembershipScreen";
import { ProfileScreen } from "./ProfileScreen";
import { RegisterScreen } from "./RegisterScreen";
import { memberNav, type MemberScreen } from "./navigation";
import { clearSession, loadSession, saveSession, type MemberSession } from "./session";
import { Splash } from "./Splash";

export function App() {
  const [session, setSession] = useState<MemberSession | null>(() => loadSession());
  const [showSplash, setShowSplash] = useState(true);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [screen, setScreen] = useState<MemberScreen>("home");

  useEffect(() => {
    const timer = window.setTimeout(() => setShowSplash(false), 900);
    return () => window.clearTimeout(timer);
  }, []);

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
  const nav = memberNav(screen, setScreen);

  if (screen === "membership") {
    return <MembershipScreen session={session} nav={nav} onSignOut={onSignOut} />;
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

  return <HomeScreen session={session} nav={nav} onSignOut={onSignOut} />;
}
