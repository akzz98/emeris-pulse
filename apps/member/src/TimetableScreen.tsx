import { useEffect, useState } from "react";
import { AppShell, EmptyState, ErrorState, LoadingState, type AppNavItem } from "@emeris/ui";
import { getTimetable, type ClassSession } from "./api";
import "./classes.css";
import type { MemberSession } from "./session";

type TimetableScreenProps = {
  session: MemberSession;
  nav: AppNavItem[];
  onSignOut: () => void;
};

// Class times are stored as local wall-clock values, so they must not be treated as UTC.
function formatWhen(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function placeLabel(item: ClassSession): string {
  if (item.status === "Cancelled") {
    return "Cancelled";
  }
  if (item.myStatus === "Booked") {
    return "Your place is booked";
  }
  if (item.myStatus === "Waitlisted") {
    return "You are on the waitlist";
  }
  if (item.seatsLeft === 0) {
    return "Full";
  }
  return `${item.seatsLeft} of ${item.capacity} seats left`;
}

export function TimetableScreen({ session, nav, onSignOut }: TimetableScreenProps) {
  const [classes, setClasses] = useState<ClassSession[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    getTimetable(session.accessToken)
      .then((next) => {
        if (active) {
          setClasses(next.classes);
        }
      })
      .catch((caught: unknown) => {
        if (!active) {
          return;
        }
        const message = caught instanceof Error ? caught.message : "Could not load the timetable.";
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
    <AppShell area="Member" nav={nav} onSignOut={onSignOut}>
      <header className="classes-heading">
        <h1>Class timetable</h1>
        <p>Upcoming classes so you can plan around lectures.</p>
      </header>
      {loading ? <LoadingState title="Loading timetable" message="Fetching upcoming classes." /> : null}
      {error ? <ErrorState title="Timetable unavailable" message={error} /> : null}
      {classes && classes.length === 0 ? (
        <EmptyState title="No upcoming classes" message="Scheduled classes will appear here." />
      ) : null}
      {classes && classes.length > 0 ? (
        <ul className="class-list">
          {classes.map((item) => (
            <li key={item.id}>
              <h2>{item.title}</h2>
              <p>{formatWhen(item.startsAt)}</p>
              <p>
                {item.location} · {item.instructorName}
              </p>
              <p className="class-place">{placeLabel(item)}</p>
            </li>
          ))}
        </ul>
      ) : null}
    </AppShell>
  );
}
