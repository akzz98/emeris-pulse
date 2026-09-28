import { FormEvent, useState } from "react";
import { AppShell, Button, ErrorState, TextField } from "@emeris/ui";
import { login } from "./api";
import "./login.css";
import type { AdminSession } from "./api";

type LoginScreenProps = {
  onSignedIn: (session: AdminSession) => void;
};

export function LoginScreen({ onSignedIn }: LoginScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      onSignedIn(await login(email, password));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Sign in failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell area="Admin">
      <form className="login-form" onSubmit={onSubmit}>
        <h1>Sign in</h1>
        <p className="form-note">Gym administrators and facility managers sign in here.</p>
        {error ? <ErrorState title="Could not sign in" message={error} /> : null}
        <TextField id="admin-email" label="Email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required />
        <TextField id="admin-password" label="Password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        <Button type="submit" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </AppShell>
  );
}
