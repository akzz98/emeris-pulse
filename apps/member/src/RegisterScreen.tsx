import { FormEvent, useState } from "react";
import { AppShell, Button, ErrorState, Select, TextField, TextLink } from "@emeris/ui";
import { register } from "./api";
import "./splash.css";
import type { MemberSession } from "./session";

type RegisterScreenProps = {
  onSignedIn: (session: MemberSession) => void;
  onSignIn: () => void;
};

export function RegisterScreen({ onSignedIn, onSignIn }: RegisterScreenProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [campusIdentifier, setCampusIdentifier] = useState("");
  const [role, setRole] = useState<"Student" | "Staff">("Student");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < 8) {
      setPasswordError("Use at least 8 characters.");
      setError(null);
      return;
    }
    setPasswordError(null);
    setBusy(true);
    setError(null);
    try {
      onSignedIn(
        await register({
          firstName,
          lastName,
          email,
          campusIdentifier,
          role,
          phone: phone.trim() || undefined,
          password,
        }),
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Registration failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell area="Member">
      <form className="login-form" onSubmit={onSubmit}>
        <h1>Create your gym profile</h1>
        <p className="form-note">Student membership runs for a semester. Staff membership runs for a year. An admin activates it before you can enter.</p>
        {error ? <ErrorState title="Could not register" message={error} /> : null}
        <TextField id="first-name" label="First name" autoComplete="given-name" value={firstName} onChange={(event) => setFirstName(event.target.value)} required />
        <TextField id="last-name" label="Last name" autoComplete="family-name" value={lastName} onChange={(event) => setLastName(event.target.value)} required />
        <TextField id="register-email" label="Email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        <TextField
          id="campus-id"
          label="Campus identifier"
          autoComplete="off"
          value={campusIdentifier}
          onChange={(event) => setCampusIdentifier(event.target.value)}
          required
          minLength={4}
          hint="At least 4 characters."
        />
        <Select id="member-role" label="I am" value={role} onChange={(event) => setRole(event.target.value as "Student" | "Staff")}>
          <option value="Student">A student</option>
          <option value="Staff">A staff member</option>
        </Select>
        <TextField
          id="phone"
          label="Phone (optional)"
          type="tel"
          autoComplete="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          hint="Optional. Notices stay in the app."
        />
        <TextField
          id="register-password"
          label="Password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            if (passwordError) {
              setPasswordError(null);
            }
          }}
          required
          hint="At least 8 characters."
          error={passwordError ?? undefined}
        />
        <Button type="submit" disabled={busy}>
          {busy ? "Creating profile…" : "Create profile"}
        </Button>
        <p className="form-switch">
          Already registered?{" "}
          <TextLink
            href="#sign-in"
            onClick={(event) => {
              event.preventDefault();
              onSignIn();
            }}
          >
            Sign in
          </TextLink>
        </p>
      </form>
    </AppShell>
  );
}
