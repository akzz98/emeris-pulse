import { FormEvent, useState } from "react";
import { AppShell, Button, ErrorState, ForgotPasswordNote, PasswordField, TextField } from "@emeris/ui";
import { login } from "./api";
import "./login.css";
import type { InstructorSession } from "./api";

type LoginScreenProps = {
  onSignedIn: (session: InstructorSession) => void;
};

export function LoginScreen({ onSignedIn }: LoginScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextEmailError = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? null : "Enter a valid email address.";
    const nextPasswordError = password.length > 0 ? null : "Enter your password.";
    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);
    if (nextEmailError || nextPasswordError) {
      setError(null);
      return;
    }
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
    <AppShell area="Instructor">
      <form className="login-form" onSubmit={onSubmit} noValidate>
        <h1>Sign in</h1>
        <p className="form-note">Instructors sign in to see who is booked into today's classes.</p>
        {error ? <ErrorState title="Could not sign in" message={error} /> : null}
        <TextField
          id="instructor-email"
          label="Email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setEmailError(null);
          }}
          error={emailError ?? undefined}
        />
        <PasswordField
          id="instructor-password"
          label="Password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            setPasswordError(null);
          }}
          error={passwordError ?? undefined}
        />
        <ForgotPasswordNote />
        <Button type="submit" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </AppShell>
  );
}
