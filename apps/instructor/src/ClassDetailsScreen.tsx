import { FormEvent, useEffect, useState } from "react";
import { AppShell, Button, EmptyState, ErrorState, LoadingState, TextField, type AppNavItem } from "@emeris/ui";
import { cancelClass, getMyClasses, messageBookedMembers, type InstructorClass, type InstructorSession } from "./api";
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
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [messagingId, setMessagingId] = useState<number | null>(null);

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
    setCancellingId(classId);
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
      setCancellingId(null);
    }
  }

  async function onMessage(classId: number, message: string): Promise<boolean> {
    setMessagingId(classId);
    setError(null);
    try {
      const result = await messageBookedMembers(session.accessToken, classId, message);
      setNotice(
        result.notified === 0
          ? "No booked members to tell."
          : result.notified === 1
            ? "1 booked member was told."
            : `${result.notified} booked members were told.`,
      );
      return true;
    } catch (caught) {
      const messageText = caught instanceof Error ? caught.message : "Could not send this message.";
      if (messageText === "UNAUTHENTICATED") {
        onSignOut();
        return false;
      }
      setError(messageText);
      return false;
    } finally {
      setMessagingId(null);
    }
  }

  return (
    <AppShell area="Instructor" nav={nav} onSignOut={onSignOut}>
      <header className="roster-heading">
        <h1>Class details</h1>
        <p>Cancel a class that has not ended, or send a note to members who are booked. Waitlisted members are not included.</p>
      </header>
      {loading ? <LoadingState title="Loading classes" message="Fetching classes you still teach." /> : null}
      {error ? <ErrorState title="That did not go through" message={error} /> : null}
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
              <ClassMessage
                classId={item.id}
                disabled={cancellingId !== null || messagingId !== null}
                sending={messagingId === item.id}
                onSend={(message) => onMessage(item.id, message)}
              />
              <Button type="button" disabled={cancellingId !== null || messagingId !== null} onClick={() => void onCancel(item.id)}>
                {cancellingId === item.id ? "Cancelling…" : "Cancel class"}
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </AppShell>
  );
}

function ClassMessage({
  classId,
  disabled,
  sending,
  onSend,
}: {
  classId: number;
  disabled: boolean;
  sending: boolean;
  onSend: (message: string) => Promise<boolean>;
}) {
  const [message, setMessage] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const sent = await onSend(message);
    if (sent) {
      setMessage("");
    }
  }

  return (
    <form className="class-message" onSubmit={(event) => void onSubmit(event)}>
      <TextField
        id={`message-${classId}`}
        label="Message"
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        maxLength={400}
        required
      />
      <Button type="submit" disabled={disabled || message.trim().length === 0}>
        {sending ? "Sending…" : "Send to booked members"}
      </Button>
    </form>
  );
}
