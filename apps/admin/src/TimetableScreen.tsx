import { FormEvent, useEffect, useState } from "react";
import { AppShell, Button, ErrorState, LoadingState, TextField, type AppNavItem } from "@emeris/ui";
import {
  getManagedClasses,
  publishClass,
  updateClass,
  type AdminSession,
  type ClassDraft,
  type InstructorOption,
  type ManagedClass,
} from "./api";
import "./timetable.css";

type TimetableScreenProps = {
  session: AdminSession;
  nav: AppNavItem[];
  onSignOut: () => void;
};

function clock(value: string): string {
  return value.slice(0, 16);
}

const emptyDraft: ClassDraft = {
  title: "",
  instructorEmail: "",
  startsAt: "",
  endsAt: "",
  capacity: 12,
  location: "",
};

export function TimetableScreen({ session, nav, onSignOut }: TimetableScreenProps) {
  const [classes, setClasses] = useState<ManagedClass[] | null>(null);
  const [instructors, setInstructors] = useState<InstructorOption[]>([]);
  const [draft, setDraft] = useState<ClassDraft>(emptyDraft);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  async function load() {
    const next = await getManagedClasses(session.accessToken);
    setClasses(next.classes);
    setInstructors(next.instructors);
  }

  useEffect(() => {
    let active = true;
    setLoading(true);
    getManagedClasses(session.accessToken)
      .then((next) => {
        if (!active) {
          return;
        }
        setClasses(next.classes);
        setInstructors(next.instructors);
        setDraft((current) => ({
          ...current,
          instructorEmail: current.instructorEmail || next.instructors[0]?.email || "",
        }));
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

  async function onPublish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await publishClass(session.accessToken, { ...draft, capacity: Number(draft.capacity) });
      await load();
      setNotice(`${draft.title} is on the timetable.`);
      setDraft({ ...emptyDraft, instructorEmail: draft.instructorEmail });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Could not publish the class.";
      if (message === "UNAUTHENTICATED") {
        onSignOut();
        return;
      }
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  async function onSave(item: ManagedClass, next: ClassDraft) {
    setBusy(true);
    setError(null);
    try {
      await updateClass(session.accessToken, item.id, { ...next, capacity: Number(next.capacity) });
      await load();
      setNotice(`${next.title} was updated.`);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Could not update the class.";
      if (message === "UNAUTHENTICATED") {
        onSignOut();
        return;
      }
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell area="Admin" nav={nav} onSignOut={onSignOut}>
      <header className="timetable-heading">
        <h1>Timetable</h1>
        <p>Publish a class, or change its time, capacity, and instructor. Capacity cannot drop below booked places.</p>
      </header>
      {loading ? <LoadingState title="Loading timetable" message="Fetching scheduled classes." /> : null}
      {error ? <ErrorState title="Timetable not saved" message={error} /> : null}
      {notice ? (
        <p className="timetable-notice" role="status">
          {notice}
        </p>
      ) : null}
      <form className="timetable-form" onSubmit={onPublish}>
        <h2>Publish a class</h2>
        <TextField id="class-title" label="Title" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} required />
        <label className="ep-field" htmlFor="class-instructor">
          Instructor
          <select
            id="class-instructor"
            value={draft.instructorEmail}
            onChange={(event) => setDraft({ ...draft, instructorEmail: event.target.value })}
            required
          >
            {instructors.map((instructor) => (
              <option key={instructor.id} value={instructor.email}>
                {instructor.firstName} {instructor.lastName}
              </option>
            ))}
          </select>
        </label>
        <TextField id="class-start" label="Starts" type="datetime-local" value={draft.startsAt} onChange={(event) => setDraft({ ...draft, startsAt: event.target.value })} required />
        <TextField id="class-end" label="Ends" type="datetime-local" value={draft.endsAt} onChange={(event) => setDraft({ ...draft, endsAt: event.target.value })} required />
        <TextField id="class-capacity" label="Capacity" type="number" min={1} value={String(draft.capacity)} onChange={(event) => setDraft({ ...draft, capacity: Number(event.target.value) })} required />
        <TextField id="class-location" label="Location" value={draft.location} onChange={(event) => setDraft({ ...draft, location: event.target.value })} required />
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : "Publish class"}
        </Button>
      </form>
      {classes && classes.length > 0 ? (
        <ul className="timetable-list">
          {classes.map((item) => (
            <ClassEditor key={item.id} item={item} instructors={instructors} disabled={busy} onSave={onSave} />
          ))}
        </ul>
      ) : null}
    </AppShell>
  );
}

function ClassEditor({
  item,
  instructors,
  disabled,
  onSave,
}: {
  item: ManagedClass;
  instructors: InstructorOption[];
  disabled: boolean;
  onSave: (item: ManagedClass, draft: ClassDraft) => Promise<void>;
}) {
  const [draft, setDraft] = useState<ClassDraft>({
    title: item.title,
    instructorEmail: item.instructorEmail,
    startsAt: clock(item.startsAt),
    endsAt: clock(item.endsAt),
    capacity: item.capacity,
    location: item.location,
  });

  return (
    <li>
      <h2>{item.title}</h2>
      <p>
        {item.bookedCount} booked · {item.instructorName}
      </p>
      <TextField id={`title-${item.id}`} label="Title" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} required />
      <label className="ep-field" htmlFor={`instructor-${item.id}`}>
        Instructor
        <select
          id={`instructor-${item.id}`}
          value={draft.instructorEmail}
          onChange={(event) => setDraft({ ...draft, instructorEmail: event.target.value })}
        >
          {instructors.map((instructor) => (
            <option key={instructor.id} value={instructor.email}>
              {instructor.firstName} {instructor.lastName}
            </option>
          ))}
        </select>
      </label>
      <TextField id={`start-${item.id}`} label="Starts" type="datetime-local" value={draft.startsAt} onChange={(event) => setDraft({ ...draft, startsAt: event.target.value })} required />
      <TextField id={`end-${item.id}`} label="Ends" type="datetime-local" value={draft.endsAt} onChange={(event) => setDraft({ ...draft, endsAt: event.target.value })} required />
      <TextField id={`capacity-${item.id}`} label="Capacity" type="number" min={1} value={String(draft.capacity)} onChange={(event) => setDraft({ ...draft, capacity: Number(event.target.value) })} required />
      <TextField id={`location-${item.id}`} label="Location" value={draft.location} onChange={(event) => setDraft({ ...draft, location: event.target.value })} required />
      <Button type="button" disabled={disabled} onClick={() => void onSave(item, draft)}>
        Save changes
      </Button>
    </li>
  );
}
