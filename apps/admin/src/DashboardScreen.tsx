import { FormEvent, useEffect, useState } from "react";
import { AppShell, Button, ConfirmDialog, EmptyState, ErrorState, LoadingState, TextField, type AppNavItem } from "@emeris/ui";
import { announceClosure, getOccupancy, getUtilisation, type AdminSession, type Occupancy, type Utilisation } from "./api";
import "./dashboard.css";

type DashboardScreenProps = {
  session: AdminSession;
  nav: AppNavItem[];
  onSignOut: () => void;
};

function formatHour(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

function peakLabel(hours: number[]): string {
  const labels = hours.map(formatHour);
  if (labels.length === 1) {
    return `Busiest hour is ${labels[0]}.`;
  }
  return `Busiest hours are ${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}.`;
}

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function formatClosureDay(value: string): string {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function closureWindowLabel(startsOn: string, endsOn: string): string {
  if (startsOn === endsOn) {
    return formatClosureDay(startsOn);
  }
  return `${formatClosureDay(startsOn)} to ${formatClosureDay(endsOn)}`;
}

export function DashboardScreen({ session, nav, onSignOut }: DashboardScreenProps) {
  const [occupancy, setOccupancy] = useState<Occupancy | null>(null);
  const [utilisation, setUtilisation] = useState<Utilisation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [utilisationError, setUtilisationError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [utilisationLoading, setUtilisationLoading] = useState(true);
  const [closure, setClosure] = useState({ startsOn: "", endsOn: "", reason: "" });
  const [closureNotice, setClosureNotice] = useState<string | null>(null);
  const [closureError, setClosureError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [confirmClosure, setConfirmClosure] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setUtilisationLoading(true);

    async function loadOccupancy() {
      try {
        const next = await getOccupancy(session.accessToken);
        if (active) {
          setOccupancy(next);
          setError(null);
        }
      } catch (caught) {
        if (!active) {
          return;
        }
        const message = caught instanceof Error ? caught.message : "Could not load occupancy.";
        if (message === "UNAUTHENTICATED") {
          onSignOut();
          return;
        }
        setError(message);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    async function loadUtilisation(showLoading: boolean) {
      if (showLoading && active) {
        setUtilisationLoading(true);
      }
      try {
        const next = await getUtilisation(session.accessToken);
        if (active) {
          setUtilisation(next);
          setUtilisationError(null);
        }
      } catch (caught) {
        if (!active) {
          return;
        }
        const message = caught instanceof Error ? caught.message : "Could not load utilisation.";
        if (message === "UNAUTHENTICATED") {
          onSignOut();
          return;
        }
        setUtilisationError(message);
      } finally {
        if (active && showLoading) {
          setUtilisationLoading(false);
        }
      }
    }

    void loadOccupancy();
    void loadUtilisation(true);
    // New entrance scans should show up without a reload, and without hiding the report.
    const timer = window.setInterval(() => {
      void loadOccupancy();
      void loadUtilisation(false);
    }, 30_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [session.accessToken, onSignOut]);

  function onClosureSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setClosureError(null);
    setConfirmClosure(true);
  }

  async function onClosureConfirmed() {
    setSending(true);
    setConfirmClosure(false);
    setClosureError(null);
    setClosureNotice(null);
    try {
      const result = await announceClosure(session.accessToken, closure);
      const told =
        result.notified === 0
          ? "No members have a class in that window."
          : result.notified === 1
            ? "1 member with a class in that window was told."
            : `${result.notified} members with a class in that window were told.`;
      setClosureNotice(told);
      setClosure({ startsOn: "", endsOn: "", reason: "" });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Could not send the closure notice.";
      if (message === "UNAUTHENTICATED") {
        onSignOut();
        return;
      }
      setClosureError(message);
    } finally {
      setSending(false);
    }
  }

  const area = session.user.role === "FacilityManager" ? "Facility" : "Admin";

  return (
    <AppShell area={area} nav={nav} onSignOut={onSignOut}>
      <header className="dashboard-heading">
        <h1>Dashboard</h1>
        <p>Who is on the floor, and which hours the granted visits fall into.</p>
      </header>
      {loading ? <LoadingState title="Loading dashboard" message="Checking who is on the floor." /> : null}
      {error ? <ErrorState title="Occupancy unavailable" message={error} /> : null}
      {occupancy ? (
        <section className="occupancy" aria-labelledby="occupancy-heading">
          <h2 id="occupancy-heading">On the floor</h2>
          <p className="occupancy-count">{occupancy.onFloor}</p>
          <p>
            {occupancy.onFloor === 1 ? "person" : "people"} on the floor. A granted entry counts for{" "}
            {occupancy.windowMinutes} minutes.
          </p>
          {occupancy.members.length === 0 ? (
            <p>No granted entries in that window.</p>
          ) : (
            <ul>
              {occupancy.members.map((member) => (
                <li key={`${member.firstName}-${member.lastName}-${member.enteredAt}`}>
                  <span>
                    {member.firstName} {member.lastName}
                  </span>
                  <span>Entered {formatWhen(member.enteredAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
      <section className="utilisation" aria-labelledby="utilisation-heading">
        <h2 id="utilisation-heading">Utilisation</h2>
        <p>Granted visits only. Hours are campus time.</p>
        {utilisationLoading ? (
          <LoadingState title="Loading utilisation" message="Checking granted visits from the last 7 days." />
        ) : null}
        {!utilisationLoading && utilisationError ? (
          <ErrorState title="Utilisation unavailable" message={utilisationError} />
        ) : null}
        {!utilisationLoading && utilisation && utilisation.visitsThisWeek === 0 ? (
          <EmptyState title="No visits" message="Granted entrance scans from the last 7 days appear here." />
        ) : null}
        {!utilisationLoading && utilisation && utilisation.visitsThisWeek > 0 ? (
          <>
            <p className="utilisation-counts">
              {utilisation.visitsToday} today · {utilisation.visitsThisWeek} in the last 7 days
            </p>
            <p>{peakLabel(utilisation.peakHours)}</p>
            <ul>
              {utilisation.hours.map((hour) => (
                <li key={hour.hour} className={utilisation.peakHours.includes(hour.hour) ? "is-peak" : undefined}>
                  <span>{formatHour(hour.hour)}</span>
                  <span>{hour.visits === 1 ? "1 visit" : `${hour.visits} visits`}</span>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </section>
      <section className="closure" aria-labelledby="closure-heading">
        <h2 id="closure-heading">Gym closure</h2>
        <p>Tell members who have a class on the closed days. Other members are not notified.</p>
        {closureError ? <ErrorState title="Closure not sent" message={closureError} /> : null}
        {closureNotice ? (
          <p className="closure-notice" role="status">
            {closureNotice}
          </p>
        ) : null}
        <form onSubmit={onClosureSubmit}>
          <TextField
            id="closure-starts"
            label="Starts"
            type="date"
            value={closure.startsOn}
            onChange={(event) => setClosure({ ...closure, startsOn: event.target.value })}
            required
          />
          <TextField
            id="closure-ends"
            label="Ends"
            type="date"
            value={closure.endsOn}
            onChange={(event) => setClosure({ ...closure, endsOn: event.target.value })}
            required
          />
          <TextField
            id="closure-reason"
            label="Reason"
            value={closure.reason}
            onChange={(event) => setClosure({ ...closure, reason: event.target.value })}
            maxLength={400}
            required
          />
          <Button type="submit" disabled={sending}>
            {sending ? "Sending…" : "Tell affected members"}
          </Button>
        </form>
      </section>
      <ConfirmDialog
        open={confirmClosure}
        title="Send this gym closure notice?"
        message={
          closure.startsOn && closure.endsOn
            ? `Members with a class on ${closureWindowLabel(closure.startsOn, closure.endsOn)} will be told. Other members are not notified.`
            : ""
        }
        confirmLabel="Tell affected members"
        cancelLabel="Keep drafting"
        confirmVariant="primary"
        busy={sending}
        onCancel={() => setConfirmClosure(false)}
        onConfirm={() => {
          void onClosureConfirmed();
        }}
      />
    </AppShell>
  );
}
