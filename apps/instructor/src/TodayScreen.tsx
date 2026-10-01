import { useEffect, useState } from "react";
import { AppShell, Button, EmptyState, ErrorState, LoadingState, type AppNavItem } from "@emeris/ui";
import {
  getAttendance,
  getMyClasses,
  getTrends,
  type AttendanceClass,
  type InstructorClass,
  type InstructorSession,
  type Trend,
} from "./api";
import "./roster.css";

type TodayScreenProps = {
  session: InstructorSession;
  nav: AppNavItem[];
  onSignOut: () => void;
  onOpenClass: (classId: number) => void;
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

function isToday(value: string): boolean {
  const date = new Date(value);
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

export function TodayScreen({ session, nav, onSignOut, onOpenClass }: TodayScreenProps) {
  const [classes, setClasses] = useState<InstructorClass[] | null>(null);
  const [started, setStarted] = useState<AttendanceClass[]>([]);
  const [trends, setTrends] = useState<Trend[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    Promise.all([getMyClasses(session.accessToken), getAttendance(session.accessToken), getTrends(session.accessToken)])
      .then(([mine, attendance, nextTrends]) => {
        if (active) {
          setClasses(mine.classes);
          setStarted(attendance.classes);
          setTrends(nextTrends.classes);
        }
      })
      .catch((caught: unknown) => {
        if (!active) {
          return;
        }
        const message = caught instanceof Error ? caught.message : "Could not load today's classes.";
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

  const today = (classes ?? []).filter((item) => isToday(item.startsAt));
  const upcoming = (classes ?? []).filter((item) => !isToday(item.startsAt));
  const openIds = new Set((classes ?? []).map((item) => item.id));
  const startedOnly = started.filter((item) => !openIds.has(item.id));

  return (
    <AppShell area="Instructor" nav={nav} onSignOut={onSignOut}>
      <header className="roster-heading">
        <h1>Today</h1>
        <p>Open a class for the roster, attendance, and messages. Waitlisted members are not on the roster.</p>
      </header>
      {loading ? <LoadingState title="Loading today" message="Checking your scheduled classes." /> : null}
      {error ? <ErrorState title="Classes unavailable" message={error} /> : null}
      {!loading && classes && today.length === 0 && startedOnly.length === 0 ? (
        <EmptyState title="No classes today" message="Upcoming classes still appear below when you have them." />
      ) : null}
      {today.length > 0 ? (
        <ul className="roster-list">
          {today.map((item) => (
            <li key={item.id}>
              <h2>{item.title}</h2>
              <p>
                {formatWhen(item.startsAt)} · {item.location}
              </p>
              <p>
                {item.bookedCount} booked · {item.waitlistedCount} waitlisted
              </p>
              <Button type="button" onClick={() => onOpenClass(item.id)}>
                Open class
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
      {startedOnly.length > 0 ? (
        <section className="roster-trends" aria-labelledby="started-heading">
          <h2 id="started-heading">Ready for attendance</h2>
          <ul className="roster-list">
            {startedOnly.map((item) => (
              <li key={item.id}>
                <h3>{item.title}</h3>
                <p>
                  {formatWhen(item.startsAt)} · {item.location}
                </p>
                <Button type="button" onClick={() => onOpenClass(item.id)}>
                  Open class
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {upcoming.length > 0 ? (
        <section className="roster-trends" aria-labelledby="upcoming-heading">
          <h2 id="upcoming-heading">Upcoming</h2>
          <ul className="roster-list">
            {upcoming.map((item) => (
              <li key={item.id}>
                <h3>{item.title}</h3>
                <p>
                  {formatWhen(item.startsAt)} · {item.location}
                </p>
                <Button type="button" variant="secondary" onClick={() => onOpenClass(item.id)}>
                  Open class
                </Button>
              </li>
            ))}
          </ul>
        </section>
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
