import { useEffect, useState } from "react";
import { AppShell, Button, EmptyState, ErrorState, LoadingState, type AppNavItem } from "@emeris/ui";
import { bookClass, cancelBooking, getTimetable, type ClassSession } from "./api";
import "./classes.css";
import type { MemberSession } from "./session";

type BookScreenProps = {
  session: MemberSession;
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

export function BookScreen({ session, nav, onSignOut }: BookScreenProps) {
  const [classes, setClasses] = useState<ClassSession[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

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
        const message = caught instanceof Error ? caught.message : "Could not load classes.";
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

  async function refresh(message: string) {
    const next = await getTimetable(session.accessToken);
    setClasses(next.classes);
    setNotice(message);
    setError(null);
  }

  async function onBook(classId: number) {
    setBusyId(classId);
    try {
      const result = await bookClass(session.accessToken, classId);
      await refresh(
        result.status === "Waitlisted"
          ? "The class is full. You are on the waitlist."
          : "Your place is booked. A class reminder is in your notices.",
      );
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Could not book this class.";
      if (message === "UNAUTHENTICATED") {
        onSignOut();
        return;
      }
      setNotice(null);
      setError(message);
    } finally {
      setBusyId(null);
    }
  }

  async function onCancel(classId: number) {
    setBusyId(classId);
    try {
      const result = await cancelBooking(session.accessToken, classId);
      const promoted = result.promoted;
      await refresh(
        promoted
          ? `Your place has been cancelled. ${promoted.firstName} ${promoted.lastName} has taken the seat.`
          : "Your place has been cancelled.",
      );
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Could not cancel this booking.";
      if (message === "UNAUTHENTICATED") {
        onSignOut();
        return;
      }
      setNotice(null);
      setError(message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AppShell area="Member" nav={nav} onSignOut={onSignOut}>
      <header className="classes-heading">
        <h1>Book a class</h1>
        <p>A free seat is booked straight away. A full class puts you on the waitlist, and a cancellation gives that seat to the next person waiting.</p>
      </header>
      {loading ? <LoadingState title="Loading classes" message="Checking seats and your bookings." /> : null}
      {error ? <ErrorState title="Booking not changed" message={error} /> : null}
      {notice ? (
        <p className="class-notice" role="status">
          {notice}
        </p>
      ) : null}
      {classes && classes.length === 0 ? (
        <EmptyState title="No upcoming classes" message="There is nothing to book yet." />
      ) : null}
      {classes && classes.length > 0 ? (
        <ul className="class-list">
          {classes.map((item) => {
            const held = item.myStatus === "Booked" || item.myStatus === "Waitlisted";
            const canBook = item.status === "Scheduled" && !held && item.seatsLeft > 0;
            const canWaitlist = item.status === "Scheduled" && !held && item.seatsLeft === 0;
            return (
              <li key={item.id}>
                <h2>{item.title}</h2>
                <p>{formatWhen(item.startsAt)}</p>
                <p>
                  {item.location} · {item.instructorName}
                </p>
                <p className="class-place">
                  {item.status === "Cancelled"
                    ? "Cancelled"
                    : item.myStatus === "Booked"
                      ? "Your place is booked"
                      : item.myStatus === "Waitlisted"
                        ? "You are on the waitlist"
                        : item.seatsLeft === 0
                          ? "This class is full"
                          : `${item.seatsLeft} of ${item.capacity} seats left`}
                </p>
                {held ? (
                  <Button type="button" disabled={busyId === item.id} onClick={() => void onCancel(item.id)}>
                    {busyId === item.id ? "Cancelling…" : "Cancel booking"}
                  </Button>
                ) : null}
                {canBook ? (
                  <Button type="button" disabled={busyId === item.id} onClick={() => void onBook(item.id)}>
                    {busyId === item.id ? "Booking…" : "Book"}
                  </Button>
                ) : null}
                {canWaitlist ? (
                  <Button type="button" disabled={busyId === item.id} onClick={() => void onBook(item.id)}>
                    {busyId === item.id ? "Joining…" : "Join waitlist"}
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </AppShell>
  );
}
