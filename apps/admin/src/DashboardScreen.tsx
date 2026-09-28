import { useEffect, useState } from "react";
import { AppShell, ErrorState, LoadingState, type AppNavItem } from "@emeris/ui";
import { getOccupancy, type AdminSession, type Occupancy } from "./api";
import "./dashboard.css";

type DashboardScreenProps = {
  session: AdminSession;
  nav: AppNavItem[];
  onSignOut: () => void;
};

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export function DashboardScreen({ session, nav, onSignOut }: DashboardScreenProps) {
  const [occupancy, setOccupancy] = useState<Occupancy | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
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

    void load();
    // New entrance scans should show up without a reload.
    const timer = window.setInterval(() => void load(), 30_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [session.accessToken, onSignOut]);

  const area = session.user.role === "FacilityManager" ? "Facility" : "Admin";

  return (
    <AppShell area={area} nav={nav} onSignOut={onSignOut}>
      <header className="dashboard-heading">
        <h1>Dashboard</h1>
        <p>Who is on the floor, counted from granted entrance scans.</p>
      </header>
      {loading ? <LoadingState title="Loading occupancy" message="Checking the latest entries." /> : null}
      {error ? <ErrorState title="Occupancy unavailable" message={error} /> : null}
      {occupancy ? (
        <section className="occupancy" aria-labelledby="occupancy-heading">
          <p className="occupancy-count" id="occupancy-heading">
            {occupancy.onFloor}
          </p>
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
    </AppShell>
  );
}
