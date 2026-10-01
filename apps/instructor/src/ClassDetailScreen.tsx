import { FormEvent, useEffect, useState } from "react";
import { AppShell, Button, ConfirmDialog, EmptyState, ErrorState, LoadingState, SuccessBanner, TextField, type AppNavItem } from "@emeris/ui";
import {
  cancelClass,
  getAttendance,
  getMyClasses,
  getRoster,
  messageBookedMembers,
  recordAttendance,
  type AttendanceClass,
  type InstructorClass,
  type InstructorSession,
  type RosterClass,
} from "./api";
import "./roster.css";

type ClassDetailScreenProps = {
  session: InstructorSession;
  nav: AppNavItem[];
  classId: number;
  onSignOut: () => void;
  onBack: () => void;
};

type DetailTab = "roster" | "attendance" | "message";

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

function cancelConsequence(item: InstructorClass): string {
  const booked = item.bookedCount;
  const waitlisted = item.waitlistedCount;
  if (booked === 0 && waitlisted === 0) {
    return `${item.title} will be cancelled. No members are booked or waitlisted, so nobody is notified.`;
  }
  const bookedPart = booked === 1 ? "1 booked member" : `${booked} booked members`;
  const waitlistedPart = waitlisted === 1 ? "1 waitlisted member" : `${waitlisted} waitlisted members`;
  return `${item.title} will be cancelled. ${bookedPart} and ${waitlistedPart} will be notified.`;
}

export function ClassDetailScreen({ session, nav, classId, onSignOut, onBack }: ClassDetailScreenProps) {
  const [tab, setTab] = useState<DetailTab>("roster");
  const [item, setItem] = useState<InstructorClass | null>(null);
  const [rosterClass, setRosterClass] = useState<RosterClass | null>(null);
  const [attendanceClass, setAttendanceClass] = useState<AttendanceClass | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ title: string; message: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [messaging, setMessaging] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [pendingCancel, setPendingCancel] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    const [mine, roster, attendance] = await Promise.all([
      getMyClasses(session.accessToken),
      getRoster(session.accessToken),
      getAttendance(session.accessToken),
    ]);
    const mineItem = mine.classes.find((entry) => entry.id === classId) ?? null;
    const attendanceItem = attendance.classes.find((entry) => entry.id === classId) ?? null;
    setItem(
      mineItem ??
        (attendanceItem
          ? {
              id: attendanceItem.id,
              title: attendanceItem.title,
              startsAt: attendanceItem.startsAt,
              endsAt: attendanceItem.startsAt,
              location: attendanceItem.location,
              capacity: attendanceItem.members.length,
              bookedCount: attendanceItem.members.length,
              waitlistedCount: 0,
              placesHeld: attendanceItem.members.length,
            }
          : null),
    );
    setRosterClass(roster.classes.find((entry) => entry.id === classId) ?? null);
    setAttendanceClass(attendanceItem);
  }

  useEffect(() => {
    let active = true;
    setLoading(true);
    load()
      .then(() => {
        if (active) {
          setLoadError(null);
        }
      })
      .catch((caught: unknown) => {
        if (!active) {
          return;
        }
        const text = caught instanceof Error ? caught.message : "Could not load this class.";
        if (text === "UNAUTHENTICATED") {
          onSignOut();
          return;
        }
        setLoadError(text);
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.accessToken, classId, onSignOut]);

  async function onMark(userId: number, mark: "Attended" | "Absent") {
    setBusyKey(`${classId}-${userId}`);
    setActionError(null);
    setSuccess(null);
    try {
      await recordAttendance(session.accessToken, classId, userId, mark);
      await load();
      setSuccess({
        title: "Attendance saved",
        message: mark === "Attended" ? "Marked attended." : "Marked absent.",
      });
    } catch (caught) {
      const text = caught instanceof Error ? caught.message : "Could not record attendance.";
      if (text === "UNAUTHENTICATED") {
        onSignOut();
        return;
      }
      setActionError(text);
    } finally {
      setBusyKey(null);
    }
  }

  async function onSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessaging(true);
    setActionError(null);
    setSuccess(null);
    try {
      const result = await messageBookedMembers(session.accessToken, classId, message);
      setSuccess({
        title: "Message sent",
        message:
          result.notified === 0
            ? "No booked members to tell."
            : result.notified === 1
              ? "1 booked member was told."
              : `${result.notified} booked members were told.`,
      });
      setMessage("");
    } catch (caught) {
      const text = caught instanceof Error ? caught.message : "Could not send this message.";
      if (text === "UNAUTHENTICATED") {
        onSignOut();
        return;
      }
      setActionError(text);
    } finally {
      setMessaging(false);
    }
  }

  async function onCancelConfirmed() {
    setCancelling(true);
    setPendingCancel(false);
    setActionError(null);
    setSuccess(null);
    try {
      const result = await cancelClass(session.accessToken, classId);
      setSuccess({
        title: "Class cancelled",
        message:
          result.notified === 1
            ? "The class is cancelled. 1 member was notified."
            : `The class is cancelled. ${result.notified} members were notified.`,
      });
      onBack();
    } catch (caught) {
      const text = caught instanceof Error ? caught.message : "Could not cancel this class.";
      if (text === "UNAUTHENTICATED") {
        onSignOut();
        return;
      }
      setActionError(text);
    } finally {
      setCancelling(false);
    }
  }

  return (
    <AppShell area="Instructor" nav={nav} onSignOut={onSignOut}>
      <header className="roster-heading">
        <p>
          <Button type="button" variant="ghost" onClick={onBack}>
            Back to Today
          </Button>
        </p>
        <h1>{item?.title ?? "Class"}</h1>
        {item ? (
          <p>
            {formatWhen(item.startsAt)} · {item.location} · {item.bookedCount} booked · {item.waitlistedCount} waitlisted
          </p>
        ) : (
          <p>Roster, attendance, and messages for this class.</p>
        )}
      </header>
      {loading ? <LoadingState title="Loading class" message="Fetching roster and attendance." /> : null}
      {loadError ? <ErrorState title="Could not load class" message={loadError} /> : null}
      {actionError ? <ErrorState title="Class not updated" message={actionError} /> : null}
      {success ? <SuccessBanner title={success.title} message={success.message} /> : null}
      {!loading && !item ? <EmptyState title="Class not found" message="It may have ended or been cancelled." /> : null}
      {item ? (
        <>
          <div className="class-tabs" role="tablist" aria-label="Class sections">
            {(
              [
                ["roster", "Roster"],
                ["attendance", "Attendance"],
                ["message", "Message / Cancel"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                className={tab === id ? "is-active" : undefined}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </div>
          {tab === "roster" ? (
            <section role="tabpanel" aria-label="Roster">
              {!rosterClass ? (
                <EmptyState title="No roster for this day" message="Booked members appear here on the day of the class." />
              ) : rosterClass.members.length === 0 ? (
                <EmptyState title="No booked members" message="Waitlisted members are not listed on the roster." />
              ) : (
                <ul className="roster-list">
                  {rosterClass.members.map((member) => (
                    <li key={member.email}>
                      {member.firstName} {member.lastName}
                      <span>{member.email}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}
          {tab === "attendance" ? (
            <section role="tabpanel" aria-label="Attendance">
              {!attendanceClass ? (
                <EmptyState title="Attendance not open yet" message="Attendance opens after this class has started." />
              ) : attendanceClass.members.length === 0 ? (
                <EmptyState title="No booked members" message="Only a booked place can be marked." />
              ) : (
                <ul className="roster-list">
                  {attendanceClass.members.map((member) => (
                    <li key={member.userId}>
                      <span>
                        {member.firstName} {member.lastName}
                        {member.status !== "Booked" ? ` · ${member.status}` : ""}
                      </span>
                      {member.status === "Booked" ? (
                        <span className="attendance-actions">
                          <Button
                            type="button"
                            variant="primary"
                            disabled={busyKey === `${classId}-${member.userId}`}
                            onClick={() => void onMark(member.userId, "Attended")}
                          >
                            Attended
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            disabled={busyKey === `${classId}-${member.userId}`}
                            onClick={() => void onMark(member.userId, "Absent")}
                          >
                            Absent
                          </Button>
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}
          {tab === "message" ? (
            <section role="tabpanel" aria-label="Message and cancel">
              <form className="class-message" onSubmit={(event) => void onSend(event)}>
                <TextField
                  id={`message-${classId}`}
                  label="Message"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  maxLength={400}
                  required
                />
                <Button type="submit" disabled={messaging || cancelling || message.trim().length === 0}>
                  {messaging ? "Sending…" : "Send to booked members"}
                </Button>
              </form>
              <Button type="button" variant="danger" disabled={messaging || cancelling} onClick={() => setPendingCancel(true)}>
                {cancelling ? "Cancelling…" : "Cancel class"}
              </Button>
            </section>
          ) : null}
        </>
      ) : null}
      <ConfirmDialog
        open={pendingCancel}
        title="Cancel this class?"
        message={item ? cancelConsequence(item) : ""}
        confirmLabel="Cancel class"
        cancelLabel="Keep class"
        confirmVariant="danger"
        busy={cancelling}
        onCancel={() => setPendingCancel(false)}
        onConfirm={() => {
          void onCancelConfirmed();
        }}
      />
    </AppShell>
  );
}
