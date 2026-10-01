import { FormEvent, useEffect, useState } from "react";
import {
  AppShell,
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  LoadingState,
  SuccessBanner,
  TextField,
  type AppNavItem,
} from "@emeris/ui";
import {
  createChallenge,
  endChallenge,
  getManagedChallenges,
  updateChallenge,
  type AdminSession,
  type ChallengeDraft,
  type ManagedChallenge,
} from "./api";
import "./challenges.css";

type ChallengeScreenProps = {
  session: AdminSession;
  nav: AppNavItem[];
  onSignOut: () => void;
};

const emptyDraft: ChallengeDraft = {
  title: "",
  description: "",
  startsOn: "",
  endsOn: "",
};

function formatDay(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function ChallengeScreen({ session, nav, onSignOut }: ChallengeScreenProps) {
  const [challenges, setChallenges] = useState<ManagedChallenge[] | null>(null);
  const [draft, setDraft] = useState<ChallengeDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [pendingEnd, setPendingEnd] = useState<ManagedChallenge | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ title: string; message: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  async function load() {
    const next = await getManagedChallenges(session.accessToken);
    setChallenges(next.challenges);
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
        const message = caught instanceof Error ? caught.message : "Could not load challenges.";
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.accessToken, onSignOut]);

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setActionError(null);
    setSuccess(null);
    try {
      const created = await createChallenge(session.accessToken, draft);
      setDraft(emptyDraft);
      await load();
      setSuccess({ title: "Challenge created", message: `${created.title} was created.` });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Could not create this challenge.";
      if (message === "UNAUTHENTICATED") {
        onSignOut();
        return;
      }
      setActionError(message);
    } finally {
      setBusy(false);
    }
  }

  async function onSave(item: ManagedChallenge, next: ChallengeDraft) {
    setBusy(true);
    setActionError(null);
    setSuccess(null);
    try {
      const updated = await updateChallenge(session.accessToken, item.id, next);
      setEditingId(null);
      await load();
      setSuccess({ title: "Challenge updated", message: `${updated.title} was saved.` });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Could not update this challenge.";
      if (message === "UNAUTHENTICATED") {
        onSignOut();
        return;
      }
      setActionError(message);
    } finally {
      setBusy(false);
    }
  }

  async function onConfirmEnd() {
    if (!pendingEnd) {
      return;
    }
    const item = pendingEnd;
    setBusy(true);
    setActionError(null);
    setSuccess(null);
    try {
      const ended = await endChallenge(session.accessToken, item.id);
      setPendingEnd(null);
      setEditingId(null);
      await load();
      setSuccess({ title: "Challenge ended", message: `${ended.title} is no longer open to join.` });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Could not end this challenge.";
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
      <header className="challenges-heading">
        <h1>Challenges</h1>
        <p>Publish a campus challenge, change its dates, or end it so members can no longer join.</p>
      </header>
      {loadError ? <ErrorState title="Could not load challenges" message={loadError} /> : null}
      {actionError ? <ErrorState title="Challenge not saved" message={actionError} /> : null}
      {success ? <SuccessBanner title={success.title} message={success.message} /> : null}
      <form className="challenges-form" onSubmit={(event) => void onCreate(event)}>
        <h2>Create a challenge</h2>
        <TextField
          id="challenge-title"
          label="Title"
          value={draft.title}
          onChange={(event) => setDraft({ ...draft, title: event.target.value })}
          maxLength={120}
          required
        />
        <TextField
          id="challenge-description"
          label="Description"
          value={draft.description}
          onChange={(event) => setDraft({ ...draft, description: event.target.value })}
          maxLength={400}
          required
        />
        <TextField
          id="challenge-starts"
          label="Starts"
          type="date"
          value={draft.startsOn}
          onChange={(event) => setDraft({ ...draft, startsOn: event.target.value })}
          required
        />
        <TextField
          id="challenge-ends"
          label="Ends"
          type="date"
          value={draft.endsOn}
          onChange={(event) => setDraft({ ...draft, endsOn: event.target.value })}
          required
        />
        <Button type="submit" disabled={busy}>
          {busy ? "Creating…" : "Create challenge"}
        </Button>
      </form>
      {loading ? <LoadingState title="Loading challenges" message="Checking campus challenges." /> : null}
      {challenges && challenges.length === 0 ? (
        <EmptyState title="No challenges" message="Create the first campus challenge." />
      ) : null}
      {challenges && challenges.length > 0 ? (
        <ul className="challenges-list">
          {challenges.map((challenge) => (
            <li key={challenge.id}>
              <div className="challenges-row">
                <div>
                  <h2>{challenge.title}</h2>
                  <p>{challenge.description}</p>
                  <p>
                    {formatDay(challenge.startsOn)} to {formatDay(challenge.endsOn)}
                  </p>
                  <p>
                    {challenge.phase} ·{" "}
                    {challenge.joinedCount === 1 ? "1 member" : `${challenge.joinedCount} members`}
                  </p>
                </div>
                <div className="challenges-actions">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={busy}
                    onClick={() => setEditingId((current) => (current === challenge.id ? null : challenge.id))}
                  >
                    {editingId === challenge.id ? "Close" : "Edit"}
                  </Button>
                  {challenge.phase !== "Ended" ? (
                    <Button type="button" variant="danger" disabled={busy} onClick={() => setPendingEnd(challenge)}>
                      End
                    </Button>
                  ) : null}
                </div>
              </div>
              {editingId === challenge.id ? (
                <ChallengeEditor item={challenge} disabled={busy} onSave={onSave} />
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      <ConfirmDialog
        open={pendingEnd !== null}
        title="End this challenge?"
        message={
          pendingEnd
            ? `${pendingEnd.title} will close immediately. Members will no longer be able to join.`
            : ""
        }
        confirmLabel="End challenge"
        cancelLabel="Keep open"
        confirmVariant="danger"
        busy={busy}
        onCancel={() => setPendingEnd(null)}
        onConfirm={() => void onConfirmEnd()}
      />
    </AppShell>
  );
}

function ChallengeEditor({
  item,
  disabled,
  onSave,
}: {
  item: ManagedChallenge;
  disabled: boolean;
  onSave: (item: ManagedChallenge, draft: ChallengeDraft) => void;
}) {
  const [draft, setDraft] = useState<ChallengeDraft>({
    title: item.title,
    description: item.description,
    startsOn: item.startsOn,
    endsOn: item.endsOn,
  });

  return (
    <div className="challenges-editor">
      <TextField
        id={`title-${item.id}`}
        label="Title"
        value={draft.title}
        onChange={(event) => setDraft({ ...draft, title: event.target.value })}
        maxLength={120}
        required
      />
      <TextField
        id={`description-${item.id}`}
        label="Description"
        value={draft.description}
        onChange={(event) => setDraft({ ...draft, description: event.target.value })}
        maxLength={400}
        required
      />
      <TextField
        id={`starts-${item.id}`}
        label="Starts"
        type="date"
        value={draft.startsOn}
        onChange={(event) => setDraft({ ...draft, startsOn: event.target.value })}
        required
      />
      <TextField
        id={`ends-${item.id}`}
        label="Ends"
        type="date"
        value={draft.endsOn}
        onChange={(event) => setDraft({ ...draft, endsOn: event.target.value })}
        required
      />
      <Button type="button" disabled={disabled} onClick={() => onSave(item, draft)}>
        Save changes
      </Button>
    </div>
  );
}
