import { useEffect, useState } from "react";
import { AppShell, EmptyState, ErrorState, LoadingState, type AppNavItem } from "@emeris/ui";
import { getRoster, getTrends, type InstructorSession, type Roster, type Trend } from "./api";
import "./roster.css";

type RosterScreenProps = {
  session: InstructorSession;
  nav: AppNavItem[];
  onSignOut: () => void;
};

function formatWhen(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export function RosterScreen({ session, nav, onSignOut }: RosterScreenProps) {
  const [roster, setRoster] = useState<Roster | null>(null);
  const [trends, setTrends] = useState<Trend[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    Promise.all([getRoster(session.accessToken), getTrends(session.accessToken)])
      .then(([nextRoster, nextTrends]) => {
        if (active) {
          setRoster(nextRoster);
          setTrends(nextTrends.classes);
        }
      })
      .catch((caught: unknown) => {
        if (!active) {
          return;
        }
        const message = caught instanceof Error ? caught.message : "Could not load today's roster.";
        if (message === "UNAUTHENTICATED") {
          onSignOut();
          return;
        }
        setError(message);
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [session.accessToken, onSignOut]);

  return (
    <AppShell area="Instructor" nav={nav} onSignOut={onSignOut}>
      <header className="roster-heading">
        <h1>My classes</h1>
        <p>Who is booked to attend today. People still on the waitlist are not listed.</p>
      </header>
      {loading ? <LoadingState title="Loading roster" message="Checking today's classes." /> : null}
      {error ? <ErrorState title="Roster unavailable" message={error} /> : null}
      {roster && roster.classes.length === 0 ? (
        <EmptyState title="No classes today" message="Scheduled classes for today will list the members to expect." />
      ) : null}
      {roster && roster.classes.length > 0 ? (
        <ul className="roster-list">
          {roster.classes.map((item) => (
            <li key={item.id}>
              <h2>{item.title}</h2>
              <p>
                {formatWhen(item.startsAt)} · {item.location}
              </p>
              {item.members.length === 0 ? <p>No booked members yet.</p> : null}
              {item.members.length > 0 ? (
                <ul>
                  {item.members.map((member) => (
                    <li key={member.email}>
                      {member.firstName} {member.lastName}
                      <span>{member.email}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      <section className="roster-trends" aria-labelledby="trends-heading">
        <h2 id="trends-heading">Attendance trends</h2>
        <p>Share of booked members marked attended, for classes you have already taken.</p>
        {trends && trends.length === 0 ? <p>No attendance has been recorded yet.</p> : null}
        {trends && trends.length > 0 ? (
          <ul className="roster-list">
            {trends.map((item) => (
              <li key={item.id}>
                <h3>{item.title}</h3>
                <p>
                  {item.attended} attended, {item.absent} absent. {item.attendanceRate}% attended.
                </p>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </AppShell>
  );
}
