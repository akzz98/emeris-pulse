import { FormEvent, useState } from "react";
import { ROLES, type Role } from "@emeris/shared";
import { AppShell, Button, ErrorState, TextField, type AppNavItem } from "@emeris/ui";
import { broadcastNotice, type AdminSession } from "./api";
import "./broadcast.css";

type BroadcastScreenProps = {
  session: AdminSession;
  nav: AppNavItem[];
  onSignOut: () => void;
};

const roleLabels: Record<Role, string> = {
  Student: "Student",
  Staff: "Staff",
  Instructor: "Instructor",
  GymAdmin: "Gym admin",
  FacilityManager: "Facility manager",
  SystemAdmin: "System admin",
};

export function BroadcastScreen({ session, nav, onSignOut }: BroadcastScreenProps) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [roles, setRoles] = useState<Role[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function toggle(role: Role) {
    setRoles((current) => (current.includes(role) ? current.filter((item) => item !== role) : [...current, role]));
  }

  async function onSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await broadcastNotice(session.accessToken, { title, message, roles });
      const told =
        result.notified === 1 ? "1 person was told." : `${result.notified} people were told.`;
      setNotice(told);
      setTitle("");
      setMessage("");
      setRoles([]);
    } catch (caught) {
      const text = caught instanceof Error ? caught.message : "Could not send this broadcast.";
      if (text === "UNAUTHENTICATED") {
        onSignOut();
        return;
      }
      setError(text);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell area="Admin" nav={nav} onSignOut={onSignOut}>
      <header className="broadcast-heading">
        <h1>Broadcast</h1>
        <p>Send one notice to every account in the roles you choose. Other roles are not included.</p>
      </header>
      {error ? <ErrorState title="Broadcast not sent" message={error} /> : null}
      {notice ? (
        <p className="broadcast-notice" role="status">
          {notice}
        </p>
      ) : null}
      <form className="broadcast-form" onSubmit={(event) => void onSend(event)}>
        <TextField id="broadcast-title" label="Title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} required />
        <TextField
          id="broadcast-message"
          label="Message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          maxLength={400}
          required
        />
        <fieldset className="broadcast-roles">
          <legend>Roles</legend>
          {ROLES.map((role) => (
            <label key={role} htmlFor={`role-${role}`}>
              <input
                id={`role-${role}`}
                type="checkbox"
                checked={roles.includes(role)}
                onChange={() => toggle(role)}
              />
              {roleLabels[role]}
            </label>
          ))}
        </fieldset>
        <Button type="submit" disabled={busy || roles.length === 0}>
          {busy ? "Sending…" : "Send broadcast"}
        </Button>
      </form>
    </AppShell>
  );
}
