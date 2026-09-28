import { useEffect, useState } from "react";
import { AppShell, Button, EmptyState, ErrorState, LoadingState, type AppNavItem } from "@emeris/ui";
import { cancelClass, getMyClasses, type InstructorClass, type InstructorSession } from "./api";
import "./roster.css";

type ClassDetailsScreenProps = {
  session: InstructorSession;
  nav: AppNavItem[];
  onSignOut: () => void;
};

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

export function ClassDetailsScreen({ session, nav, onSignOut }: ClassDetailsScreenProps) {
  const [classes, setClasses] = useState<InstructorClass[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getMyClasses(session.accessToken)
      .then((next) => {
        if (active) {
          setClasses(next.classes);
          setError(null);
        }
      })
      .catch((caught: unknown) => {
        if (!active) {
          return;
        }
        const message = caught instanceof Error ? caught.message : "Could not load your classes.";
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

  async function onCancel(classId: number) {
    setBusyId(classId);
    setError(null);
    try {
      const result = await cancelClass(session.accessToken, classId);
      const next = await getMyClasses(session.accessToken);
      setClasses(next.classes);
      setNotice(
        result.notified === 1
          ? "The class is cancelled. 1 member was notified."
          : `The class is cancelled. ${result.notified} members were notified.`,
      );
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Could not cancel this class.";
      if (message === "UNAUTHENTICATED") {
        onSignOut();
        return;
      }
      setError(message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AppShell area="Instructor" nav={nav} onSignOut={onSignOut}>
      <header className="roster-heading">
        <h1>Class details</h1>
        <p>Cancel a class that has not ended. Booked and waitlisted members are notified.</p>
      </header>
      {loading ? <LoadingState title="Loading classes" message="Fetching classes you still teach." /> : null}
      {error ? <ErrorState title="Class not cancelled" message={error} /> : null}
      {notice ? (
        <p className="class-notice" role="status">
          {notice}
        </p>
      ) : null}
      {classes && classes.length === 0 ? (
        <EmptyState title="No open classes" message="Scheduled classes that have not ended appear here." />
      ) : null}
      {classes && classes.length > 0 ? (
        <ul className="roster-list">
          {classes.map((item) => (
            <li key={item.id}>
              <h2>{item.title}</h2>
              <p>{formatWhen(item.startsAt)}</p>
              <p>
                {item.location} · capacity {item.capacity} · {item.placesHeld} still holding a place
              </p>
              <Button type="button" disabled={busyId === item.id} onClick={() => void onCancel(item.id)}>
                {busyId === item.id ? "Cancelling…" : "Cancel class"}
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </AppShell>
  );
}
