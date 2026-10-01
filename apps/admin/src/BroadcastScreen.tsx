import { FormEvent, useEffect, useState } from "react";
import { ROLES, type Role } from "@emeris/shared";
import { AppShell, Button, ConfirmDialog, ErrorState, SuccessBanner, TextField, type AppNavItem } from "@emeris/ui";
import { broadcastNotice, estimateBroadcast, type AdminSession } from "./api";
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

function summariseRoles(roles: Role[]): string {
  const labels = roles.map((role) => roleLabels[role]);
  if (labels.length === 1) {
    return labels[0];
  }
  if (labels.length === 2) {
    return `${labels[0]} and ${labels[1]}`;
  }
  return `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`;
}

function peopleLabel(count: number): string {
  return count === 1 ? "1 person" : `${count} people`;
}

export function BroadcastScreen({ session, nav, onSignOut }: BroadcastScreenProps) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [roles, setRoles] = useState<Role[]>([]);
  const [estimated, setEstimated] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ title: string; message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  function toggle(role: Role) {
    setRoles((current) => (current.includes(role) ? current.filter((item) => item !== role) : [...current, role]));
  }

  useEffect(() => {
    if (roles.length === 0) {
      setEstimated(null);
      return;
    }
    let active = true;
    const timer = window.setTimeout(() => {
      estimateBroadcast(session.accessToken, roles)
        .then((next) => {
          if (active) {
            setEstimated(next.estimated);
          }
        })
        .catch((caught: unknown) => {
          if (!active) {
            return;
          }
          const text = caught instanceof Error ? caught.message : "Could not estimate recipients.";
          if (text === "UNAUTHENTICATED") {
            onSignOut();
            return;
          }
          setEstimated(null);
        });
    }, 200);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [roles, session.accessToken, onSignOut]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (roles.length === 0) {
      return;
    }
    setError(null);
    setConfirmOpen(true);
  }

  async function onSendConfirmed() {
    setBusy(true);
    setConfirmOpen(false);
    setError(null);
    setSuccess(null);
    try {
      const result = await broadcastNotice(session.accessToken, { title, message, roles });
      const told =
        result.notified === 1 ? "1 person was told." : `${result.notified} people were told.`;
      setSuccess({ title: "Broadcast sent", message: told });
      setTitle("");
      setMessage("");
      setRoles([]);
      setEstimated(null);
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

  const recipientHint =
    roles.length === 0
      ? "Choose at least one role to estimate who will receive this."
      : estimated === null
        ? `Checking how many accounts are in ${summariseRoles(roles)}…`
        : estimated === 0
          ? `No accounts currently have the ${summariseRoles(roles)} role${roles.length === 1 ? "" : "s"}.`
          : `About ${peopleLabel(estimated)} will receive this (${summariseRoles(roles)}).`;

  const confirmMessage =
    roles.length === 0
      ? ""
      : estimated === null
        ? `This notice will reach ${summariseRoles(roles)}. Other roles are not included.`
        : estimated === 0
          ? `No accounts currently match ${summariseRoles(roles)}. Sending will not notify anyone.`
          : `This notice will reach about ${peopleLabel(estimated)} in ${summariseRoles(roles)}. Other roles are not included.`;

  return (
    <AppShell area="Admin" nav={nav} onSignOut={onSignOut}>
      <header className="broadcast-heading">
        <h1>Broadcast</h1>
        <p>Send one notice to every account in the roles you choose. Other roles are not included.</p>
      </header>
      {error ? <ErrorState title="Broadcast not sent" message={error} /> : null}
      {success ? <SuccessBanner title={success.title} message={success.message} /> : null}
      <form className="broadcast-form" onSubmit={onSubmit}>
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
        <p className="broadcast-estimate" aria-live="polite">
          {recipientHint}
        </p>
        <Button type="submit" disabled={busy || roles.length === 0}>
          {busy ? "Sending…" : "Send broadcast"}
        </Button>
      </form>
      <ConfirmDialog
        open={confirmOpen}
        title="Send this broadcast?"
        message={confirmMessage}
        confirmLabel="Send broadcast"
        cancelLabel="Keep drafting"
        confirmVariant="primary"
        busy={busy}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          void onSendConfirmed();
        }}
      />
    </AppShell>
  );
}
