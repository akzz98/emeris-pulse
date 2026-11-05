import { FormEvent, useState } from "react";
import { AppShell, Button, ErrorState, Select, TextField, TextLink } from "@emeris/ui";
import { ApiError, register } from "./api";
import "./splash.css";
import type { MemberSession } from "./session";

type RegisterScreenProps = {
  onSignedIn: (session: MemberSession) => void;
  onSignIn: () => void;
};

type RegisterFields = {
  firstName: string;
  lastName: string;
  email: string;
  campusIdentifier: string;
  password: string;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function registrationErrors(values: RegisterFields): Partial<RegisterFields> {
  const errors: Partial<RegisterFields> = {};
  if (!values.firstName.trim()) {
    errors.firstName = "Enter a first name.";
  }
  if (!values.lastName.trim()) {
    errors.lastName = "Enter a last name.";
  }
  if (!emailPattern.test(values.email.trim())) {
    errors.email = "Enter a valid email address.";
  }
  if (values.campusIdentifier.trim().length < 4) {
    errors.campusIdentifier = "Use at least 4 characters.";
  }
  if (values.password.length < 8) {
    errors.password = "Use at least 8 characters.";
  }
  return errors;
}

export function RegisterScreen({ onSignedIn, onSignIn }: RegisterScreenProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [campusIdentifier, setCampusIdentifier] = useState("");
  const [role, setRole] = useState<"Student" | "Staff">("Student");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Partial<RegisterFields>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function clearField(field: keyof RegisterFields) {
    setFieldErrors((current) => {
      if (!current[field]) {
        return current;
      }
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = registrationErrors({ firstName, lastName, email, campusIdentifier, password });
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setError(null);
      return;
    }
    setFieldErrors({});
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
      if (caught instanceof ApiError && Object.keys(caught.fieldErrors).length > 0) {
        setFieldErrors(caught.fieldErrors);
        setError(null);
      } else {
        setError(caught instanceof Error ? caught.message : "Registration failed.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell area="Member">
      <form className="login-form" onSubmit={onSubmit} noValidate>
        <h1>Create your gym profile</h1>
        <p className="form-note">Student membership runs for a semester. Staff membership runs for a year. An admin activates it before you can enter.</p>
        {error ? <ErrorState title="Could not register" message={error} /> : null}
        <TextField
          id="first-name"
          label="First name"
          autoComplete="given-name"
          value={firstName}
          onChange={(event) => {
            setFirstName(event.target.value);
            clearField("firstName");
          }}
          error={fieldErrors.firstName}
        />
        <TextField
          id="last-name"
          label="Last name"
          autoComplete="family-name"
          value={lastName}
          onChange={(event) => {
            setLastName(event.target.value);
            clearField("lastName");
          }}
          error={fieldErrors.lastName}
        />
        <TextField
          id="register-email"
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            clearField("email");
          }}
          error={fieldErrors.email}
        />
        <TextField
          id="campus-id"
          label="Campus identifier"
          autoComplete="off"
          value={campusIdentifier}
          onChange={(event) => {
            setCampusIdentifier(event.target.value);
            clearField("campusIdentifier");
          }}
          hint="At least 4 characters."
          error={fieldErrors.campusIdentifier}
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
            clearField("password");
          }}
          hint="At least 8 characters."
          error={fieldErrors.password}
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
