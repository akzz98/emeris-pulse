import { useEffect, useState } from "react";
import { HomeScreen } from "./HomeScreen";
import { LoginScreen } from "./LoginScreen";
import { MembershipScreen } from "./MembershipScreen";
import { RegisterScreen } from "./RegisterScreen";
import { clearSession, loadSession, saveSession, type MemberSession } from "./session";
import { Splash } from "./Splash";

export function App() {
  const [session, setSession] = useState<MemberSession | null>(() => loadSession());
  const [showSplash, setShowSplash] = useState(true);
  const [mode, setMode] = useState<"login" | "register">("login");
  // Signed-in screens. The shared navigation bar is a later step, so home links across for now.
  const [screen, setScreen] = useState<"home" | "membership">("home");

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

  if (screen === "membership") {
    return <MembershipScreen session={session} onHome={() => setScreen("home")} onSignOut={onSignOut} />;
  }

  return <HomeScreen session={session} onOpenMembership={() => setScreen("membership")} onSignOut={onSignOut} />;
}
