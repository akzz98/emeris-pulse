import { FormEvent, useEffect, useState } from "react";
import { AppShell, Button, EmptyState, ErrorState, LoadingState, TextField, type AppNavItem } from "@emeris/ui";
import { createChallenge, getManagedChallenges, type AdminSession, type ChallengeDraft, type ManagedChallenge } from "./api";
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
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
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
          setError(null);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.accessToken, onSignOut]);

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const created = await createChallenge(session.accessToken, draft);
      setDraft(emptyDraft);
      await load();
      setNotice(`${created.title} was created.`);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Could not create this challenge.";
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
      <header className="challenges-heading">
        <h1>Challenges</h1>
        <p>Publish a campus challenge. Members can join it on the days it runs.</p>
      </header>
      {error ? <ErrorState title="Challenge not created" message={error} /> : null}
      {notice ? (
        <p className="challenges-notice" role="status">
          {notice}
        </p>
      ) : null}
      <form className="challenges-form" onSubmit={(event) => void onCreate(event)}>
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
              <h2>{challenge.title}</h2>
              <p>{challenge.description}</p>
              <p>
                {formatDay(challenge.startsOn)} to {formatDay(challenge.endsOn)}
              </p>
              <p>
                {challenge.phase} · {challenge.joinedCount === 1 ? "1 member" : `${challenge.joinedCount} members`}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
    </AppShell>
  );
}
