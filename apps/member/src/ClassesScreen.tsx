import { useEffect, useMemo, useState } from "react";
import {
  AppShell,
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  LoadingState,
  StatusBadge,
  SuccessBanner,
  type AppNavItem,
  type StatusTone,
} from "@emeris/ui";
import { bookClass, cancelBooking, getTimetable, type ClassSession } from "./api";
import "./classes.css";
import type { MemberSession } from "./session";

type ClassesScreenProps = {
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

function dayKey(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dayLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

function classBadges(item: ClassSession): Array<{ label: string; tone: StatusTone }> {
  const badges: Array<{ label: string; tone: StatusTone }> = [];
  if (item.status === "Cancelled") {
    badges.push({ label: "Cancelled", tone: "danger" });
    return badges;
  }
  if (item.myStatus === "Booked") {
    badges.push({ label: "Booked", tone: "success" });
  } else if (item.myStatus === "Waitlisted") {
    badges.push({ label: "Waitlisted", tone: "warning" });
  } else if (item.seatsLeft === 0) {
    badges.push({ label: "Full", tone: "neutral" });
  } else {
    badges.push({ label: `${item.seatsLeft} of ${item.capacity} seats left`, tone: "info" });
  }
  return badges;
}

export function ClassesScreen({ session, nav, onSignOut }: ClassesScreenProps) {
  const [classes, setClasses] = useState<ClassSession[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ title: string; message: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [pendingCancel, setPendingCancel] = useState<ClassSession | null>(null);
  const [dayFilter, setDayFilter] = useState<string>("all");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(null);
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
        setLoadError(message);
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

  const dayOptions = useMemo(() => {
    if (!classes) {
      return [];
    }
    const seen = new Map<string, string>();
    for (const item of classes) {
      const key = dayKey(item.startsAt);
      if (!seen.has(key)) {
        seen.set(key, dayLabel(item.startsAt));
      }
    }
    return [...seen.entries()].map(([key, label]) => ({ key, label }));
  }, [classes]);

  const visible = useMemo(() => {
    if (!classes) {
      return [];
    }
    if (dayFilter === "all") {
      return classes;
    }
    return classes.filter((item) => dayKey(item.startsAt) === dayFilter);
  }, [classes, dayFilter]);

  async function refresh(nextSuccess: { title: string; message: string }) {
    const next = await getTimetable(session.accessToken);
    setClasses(next.classes);
    setSuccess(nextSuccess);
    setActionError(null);
  }

  async function onBook(classId: number) {
    setBusyId(classId);
    setSuccess(null);
    try {
      const result = await bookClass(session.accessToken, classId);
      await refresh(
        result.status === "Waitlisted"
          ? {
              title: "Added to waitlist",
              message: "The class is full. You are on the waitlist.",
            }
          : {
              title: "Place booked",
              message: "Your place is booked. A class reminder is in your notices.",
            },
      );
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Could not book this class.";
      if (message === "UNAUTHENTICATED") {
        onSignOut();
        return;
      }
      setSuccess(null);
      setActionError(message);
    } finally {
      setBusyId(null);
    }
  }

  async function onCancelConfirmed(classId: number) {
    setBusyId(classId);
    setPendingCancel(null);
    setSuccess(null);
    try {
      const result = await cancelBooking(session.accessToken, classId);
      const promoted = result.promoted;
      await refresh({
        title: "Booking cancelled",
        message: promoted
          ? `Your place has been cancelled. ${promoted.firstName} ${promoted.lastName} has taken the seat.`
          : "Your place has been cancelled.",
      });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Could not cancel this booking.";
      if (message === "UNAUTHENTICATED") {
        onSignOut();
        return;
      }
      setSuccess(null);
      setActionError(message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AppShell area="Member" nav={nav} onSignOut={onSignOut}>
      <header className="classes-heading">
        <h1>Classes</h1>
        <p>Browse the timetable, book a free seat, or join the waitlist when a class is full.</p>
      </header>
      {loading ? <LoadingState title="Loading classes" message="Checking seats and your bookings." /> : null}
      {loadError ? <ErrorState title="Could not load classes" message={loadError} /> : null}
      {actionError ? <ErrorState title="Booking not changed" message={actionError} /> : null}
      {success ? <SuccessBanner title={success.title} message={success.message} /> : null}
      {classes && classes.length > 0 ? (
        <div className="class-day-filters" role="group" aria-label="Filter by day">
          <button
            type="button"
            className={dayFilter === "all" ? "is-active" : undefined}
            aria-pressed={dayFilter === "all"}
            onClick={() => setDayFilter("all")}
          >
            All days
          </button>
          {dayOptions.map((day) => (
            <button
              key={day.key}
              type="button"
              className={dayFilter === day.key ? "is-active" : undefined}
              aria-pressed={dayFilter === day.key}
              onClick={() => setDayFilter(day.key)}
            >
              {day.label}
            </button>
          ))}
        </div>
      ) : null}
      {classes && classes.length === 0 ? (
        <EmptyState title="No upcoming classes" message="There is nothing to book yet." />
      ) : null}
      {classes && classes.length > 0 && visible.length === 0 ? (
        <EmptyState title="No classes on this day" message="Pick another day, or show all days." />
      ) : null}
      {visible.length > 0 ? (
        <ul className="class-list">
          {visible.map((item) => {
            const held = item.myStatus === "Booked" || item.myStatus === "Waitlisted";
            const canBook = item.status === "Scheduled" && !held && item.seatsLeft > 0;
            const canWaitlist = item.status === "Scheduled" && !held && item.seatsLeft === 0;
            return (
              <li key={item.id}>
                <div className="class-row-heading">
                  <h2>{item.title}</h2>
                  <div className="class-badges">
                    {classBadges(item).map((badge) => (
                      <StatusBadge key={badge.label} label={badge.label} tone={badge.tone} />
                    ))}
                  </div>
                </div>
                <p>{formatWhen(item.startsAt)}</p>
                <p>
                  {item.location} · {item.instructorName}
                </p>
                <div className="class-actions">
                  {held ? (
                    <Button type="button" variant="danger" disabled={busyId === item.id} onClick={() => setPendingCancel(item)}>
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
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
      <ConfirmDialog
        open={pendingCancel !== null}
        title={pendingCancel?.myStatus === "Waitlisted" ? "Leave the waitlist?" : "Cancel this booking?"}
        message={
          pendingCancel?.myStatus === "Waitlisted"
            ? `You will leave the waitlist for ${pendingCancel.title}.`
            : `Cancelling ${pendingCancel?.title ?? "this class"} frees your seat. If someone is waitlisted, they may be promoted into your place.`
        }
        confirmLabel={pendingCancel?.myStatus === "Waitlisted" ? "Leave waitlist" : "Cancel booking"}
        cancelLabel="Keep place"
        confirmVariant="danger"
        busy={pendingCancel !== null && busyId === pendingCancel.id}
        onCancel={() => setPendingCancel(null)}
        onConfirm={() => {
          if (pendingCancel) {
            void onCancelConfirmed(pendingCancel.id);
          }
        }}
      />
    </AppShell>
  );
}
