import { FormEvent, useEffect, useState } from "react";
import { AppShell, Button, ConfirmDialog, EmptyState, ErrorState, LoadingState, Select, SuccessBanner, TextField, type AppNavItem } from "@emeris/ui";
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

function changeWouldNotify(item: ManagedClass, draft: ClassDraft): boolean {
  return (
    draft.title !== item.title ||
    draft.location !== item.location ||
    clock(item.startsAt) !== draft.startsAt ||
    clock(item.endsAt) !== draft.endsAt ||
    draft.instructorEmail !== item.instructorEmail
  );
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
  const [editingId, setEditingId] = useState<number | null>(null);
  const [pendingSave, setPendingSave] = useState<{ item: ManagedClass; draft: ClassDraft } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ title: string; message: string } | null>(null);
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

  async function onPublish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setActionError(null);
    setSuccess(null);
    try {
      const title = draft.title;
      await publishClass(session.accessToken, { ...draft, capacity: Number(draft.capacity) });
      await load();
      setSuccess({ title: "Class published", message: `${title} is on the timetable.` });
      setDraft({ ...emptyDraft, instructorEmail: draft.instructorEmail });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Could not publish the class.";
      if (message === "UNAUTHENTICATED") {
        onSignOut();
        return;
      }
      setActionError(message);
    } finally {
      setBusy(false);
    }
  }

  function requestSave(item: ManagedClass, next: ClassDraft) {
    if (changeWouldNotify(item, next) && item.bookedCount > 0) {
      setPendingSave({ item, draft: next });
      return;
    }
    void onSave(item, next);
  }

  async function onSave(item: ManagedClass, next: ClassDraft) {
    setBusy(true);
    setPendingSave(null);
    setActionError(null);
    setSuccess(null);
    try {
      const saved = await updateClass(session.accessToken, item.id, { ...next, capacity: Number(next.capacity) });
      await load();
      setEditingId(null);
      const told =
        saved.notified === 0
          ? "No members needed a notice."
          : saved.notified === 1
            ? "1 member was told."
            : `${saved.notified} members were told.`;
      setSuccess({ title: "Class updated", message: `${next.title} was updated. ${told}` });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Could not update the class.";
      if (message === "UNAUTHENTICATED") {
        onSignOut();
        return;
      }
      setActionError(message);
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
      {loadError ? <ErrorState title="Could not load timetable" message={loadError} /> : null}
      {actionError ? <ErrorState title="Timetable not saved" message={actionError} /> : null}
      {success ? <SuccessBanner title={success.title} message={success.message} /> : null}
      <form className="timetable-form" onSubmit={onPublish}>
        <h2>Publish a class</h2>
        <TextField id="class-title" label="Title" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} required />
        <Select
          id="class-instructor"
          label="Instructor"
          value={draft.instructorEmail}
          onChange={(event) => setDraft({ ...draft, instructorEmail: event.target.value })}
          required
        >
          {instructors.map((instructor) => (
            <option key={instructor.id} value={instructor.email}>
              {instructor.firstName} {instructor.lastName}
            </option>
          ))}
        </Select>
        <TextField id="class-start" label="Starts" type="datetime-local" value={draft.startsAt} onChange={(event) => setDraft({ ...draft, startsAt: event.target.value })} required />
        <TextField id="class-end" label="Ends" type="datetime-local" value={draft.endsAt} onChange={(event) => setDraft({ ...draft, endsAt: event.target.value })} required />
        <TextField id="class-capacity" label="Capacity" type="number" min={1} value={String(draft.capacity)} onChange={(event) => setDraft({ ...draft, capacity: Number(event.target.value) })} required />
        <TextField id="class-location" label="Location" value={draft.location} onChange={(event) => setDraft({ ...draft, location: event.target.value })} required />
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : "Publish class"}
        </Button>
      </form>
      {classes && classes.length === 0 ? (
        <EmptyState title="No published classes" message="Publish a class above to put it on the timetable." />
      ) : null}
      {classes && classes.length > 0 ? (
        <ul className="timetable-list">
          {classes.map((item) => (
            <li key={item.id}>
              <div className="timetable-row">
                <div>
                  <h2>{item.title}</h2>
                  <p>
                    {formatWhen(item.startsAt)} · {item.location}
                  </p>
                  <p>
                    {item.bookedCount} booked · {item.instructorName} · capacity {item.capacity}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => setEditingId((current) => (current === item.id ? null : item.id))}
                >
                  {editingId === item.id ? "Close" : "Edit"}
                </Button>
              </div>
              {editingId === item.id ? (
                <ClassEditor item={item} instructors={instructors} disabled={busy} onSave={requestSave} />
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      <ConfirmDialog
        open={pendingSave !== null}
        title="Save and notify booked members?"
        message={
          pendingSave
            ? `Changing ${pendingSave.item.title} will tell booked and waitlisted members about the update.`
            : ""
        }
        confirmLabel="Save and notify"
        cancelLabel="Keep editing"
        confirmVariant="primary"
        busy={busy}
        onCancel={() => setPendingSave(null)}
        onConfirm={() => {
          if (pendingSave) {
            void onSave(pendingSave.item, pendingSave.draft);
          }
        }}
      />
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
  onSave: (item: ManagedClass, draft: ClassDraft) => void;
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
    <div className="timetable-editor">
      <TextField id={`title-${item.id}`} label="Title" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} required />
      <Select
        id={`instructor-${item.id}`}
        label="Instructor"
        value={draft.instructorEmail}
        onChange={(event) => setDraft({ ...draft, instructorEmail: event.target.value })}
      >
        {instructors.map((instructor) => (
          <option key={instructor.id} value={instructor.email}>
            {instructor.firstName} {instructor.lastName}
          </option>
        ))}
      </Select>
      <TextField id={`start-${item.id}`} label="Starts" type="datetime-local" value={draft.startsAt} onChange={(event) => setDraft({ ...draft, startsAt: event.target.value })} required />
      <TextField id={`end-${item.id}`} label="Ends" type="datetime-local" value={draft.endsAt} onChange={(event) => setDraft({ ...draft, endsAt: event.target.value })} required />
      <TextField id={`capacity-${item.id}`} label="Capacity" type="number" min={1} value={String(draft.capacity)} onChange={(event) => setDraft({ ...draft, capacity: Number(event.target.value) })} required />
      <TextField id={`location-${item.id}`} label="Location" value={draft.location} onChange={(event) => setDraft({ ...draft, location: event.target.value })} required />
      <Button type="button" disabled={disabled} onClick={() => onSave(item, draft)}>
        Save changes
      </Button>
    </div>
  );
}
