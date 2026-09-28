import { useEffect, useState } from "react";
import { AppShell, EmptyState, ErrorState, LoadingState, type AppNavItem } from "@emeris/ui";
import {
  getClassFill,
  getEquipmentDowntime,
  type AdminSession,
  type ClassFillReport,
  type DowntimeReport,
} from "./api";
import "./reports.css";

type ReportsScreenProps = {
  session: AdminSession;
  nav: AppNavItem[];
  onSignOut: () => void;
};

function formatWhen(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function downLabel(hours: number | null): string {
  if (hours === null) {
    return "Out of service";
  }
  if (hours < 1) {
    return "Down for less than an hour";
  }
  return hours === 1 ? "Down for 1 hour" : `Down for ${hours} hours`;
}

export function ReportsScreen({ session, nav, onSignOut }: ReportsScreenProps) {
  const [fill, setFill] = useState<ClassFillReport | null>(null);
  const [downtime, setDowntime] = useState<DowntimeReport | null>(null);
  const [fillError, setFillError] = useState<string | null>(null);
  const [downtimeError, setDowntimeError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    async function load() {
      try {
        const next = await getClassFill(session.accessToken);
        if (active) {
          setFill(next);
          setFillError(null);
        }
      } catch (caught) {
        if (!active) {
          return;
        }
        const message = caught instanceof Error ? caught.message : "Could not load the class fill report.";
        if (message === "UNAUTHENTICATED") {
          onSignOut();
          return;
        }
        setFillError(message);
      }
      try {
        const next = await getEquipmentDowntime(session.accessToken);
        if (active) {
          setDowntime(next);
          setDowntimeError(null);
        }
      } catch (caught) {
        if (!active) {
          return;
        }
        const message = caught instanceof Error ? caught.message : "Could not load the downtime report.";
        if (message === "UNAUTHENTICATED") {
          onSignOut();
          return;
        }
        setDowntimeError(message);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [session.accessToken, onSignOut]);

  const area = session.user.role === "FacilityManager" ? "Facility" : "Admin";
  const down = downtime?.machines.filter((item) => item.status === "OutOfService") ?? [];

  return (
    <AppShell area={area} nav={nav} onSignOut={onSignOut}>
      <header className="reports-heading">
        <h1>Reports</h1>
        <p>How full the classes are, and which machines are out of service.</p>
      </header>
      {loading ? <LoadingState title="Loading reports" message="Checking bookings and maintenance." /> : null}
      <section className="report" aria-labelledby="fill-heading">
        <h2 id="fill-heading">Class fill rate</h2>
        <p>A held seat counts. A waitlisted member does not.</p>
        {fillError ? <ErrorState title="Fill rate unavailable" message={fillError} /> : null}
        {fill && fill.classes.length === 0 ? (
          <EmptyState title="No classes" message="Scheduled classes appear here once they are published." />
        ) : null}
        {fill && fill.classes.length > 0 ? (
          <>
            <p className="report-summary">
              {fill.filled} of {fill.seats} seats held · {fill.fillRate}% full
            </p>
            <ul>
              {fill.classes.map((item) => (
                <li key={item.id}>
                  <h3>{item.title}</h3>
                  <p>{formatWhen(item.startsAt)}</p>
                  <p>
                    {item.location} · {item.filled} of {item.capacity} · {item.fillRate}%
                  </p>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </section>
      <section className="report" aria-labelledby="downtime-heading">
        <h2 id="downtime-heading">Equipment downtime</h2>
        <p>Time out of service is counted from the earliest ticket that is still open.</p>
        {downtimeError ? <ErrorState title="Downtime unavailable" message={downtimeError} /> : null}
        {downtime && downtime.total === 0 ? (
          <EmptyState title="No equipment" message="Machines appear here once they are registered." />
        ) : null}
        {downtime && downtime.total > 0 && down.length === 0 ? (
          <EmptyState title="No downtime" message="Every machine is available." />
        ) : null}
        {downtime && down.length > 0 ? (
          <>
            <p className="report-summary">
              {downtime.outOfService} of {downtime.total} machines out of service
            </p>
            <ul>
              {down.map((item) => (
                <li key={item.id}>
                  <h3>
                    {item.code} · {item.name}
                  </h3>
                  <p>{item.location}</p>
                  <p>
                    {downLabel(item.hoursDown)} · {item.openTickets === 1 ? "1 open ticket" : `${item.openTickets} open tickets`}
                  </p>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </section>
    </AppShell>
  );
}
