import { FormEvent, useState } from "react";
import { AppShell, Button, ErrorState, TextField } from "@emeris/ui";
import { login } from "./api";
import "./splash.css";
import type { MemberSession } from "./session";

type LoginScreenProps = {
  onSignedIn: (session: MemberSession) => void;
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
    <AppShell area="Member">
      <form className="login-form" onSubmit={onSubmit}>
        <h1>Sign in</h1>
        {error ? <ErrorState title="Could not sign in" message={error} /> : null}
        <TextField
          id="email"
          label="Email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <TextField
          id="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        <Button type="submit" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </AppShell>
  );
}
