import { useEffect, useState } from "react";
import { AppShell, Button, SuccessBanner } from "@emeris/ui";
import { LoginScreen } from "./LoginScreen";
import { RegisterScreen } from "./RegisterScreen";
import { clearSession, loadSession, saveSession, type MemberSession } from "./session";
import { Splash } from "./Splash";

export function App() {
  const [session, setSession] = useState<MemberSession | null>(() => loadSession());
  const [showSplash, setShowSplash] = useState(true);
  const [mode, setMode] = useState<"login" | "register">("login");

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

  return (
    <AppShell area="Member">
      <div className="signed-in">
        <SuccessBanner
          title={`Signed in as ${session.user.firstName}`}
          message="Your home, membership, and profile screens come next."
        />
        <Button
          onClick={() => {
            clearSession();
            setSession(null);
          }}
        >
          Sign out
        </Button>
      </div>
    </AppShell>
  );
}
