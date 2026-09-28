import { useEffect, useState } from "react";
import { AppShell, Button, EmptyState, ErrorState, LoadingState, type AppNavItem } from "@emeris/ui";
import { getChallenges, joinChallenge, type CampusChallenge } from "./api";
import "./wellness.css";
import type { MemberSession } from "./session";

type WellnessScreenProps = {
  session: MemberSession;
  nav: AppNavItem[];
  onSignOut: () => void;
};

function formatDay(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
}

export function WellnessScreen({ session, nav, onSignOut }: WellnessScreenProps) {
  const [challenges, setChallenges] = useState<CampusChallenge[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  async function load() {
    const next = await getChallenges(session.accessToken);
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

  async function onJoin(challenge: CampusChallenge) {
    setBusyId(challenge.id);
    setError(null);
    setNotice(null);
    try {
      const joined = await joinChallenge(session.accessToken, challenge.id);
      await load();
      setNotice(`You have joined ${joined.title}.`);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Could not join this challenge.";
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
    <AppShell area="Member" nav={nav} onSignOut={onSignOut}>
      <header className="wellness-heading">
        <h1>Wellness</h1>
        <p>Join a campus challenge while it is open. You can join each challenge once.</p>
      </header>
      {loading ? <LoadingState title="Loading challenges" message="Checking what is open." /> : null}
      {error ? <ErrorState title="Challenge not joined" message={error} /> : null}
      {notice ? (
        <p className="wellness-notice" role="status">
          {notice}
        </p>
      ) : null}
      {challenges && challenges.length === 0 ? (
        <EmptyState title="No open challenges" message="There is nothing to join right now." />
      ) : null}
      {challenges && challenges.length > 0 ? (
        <ul className="wellness-list">
          {challenges.map((challenge) => (
            <li key={challenge.id}>
              <h2>{challenge.title}</h2>
              <p>{challenge.description}</p>
              <p>
                {formatDay(challenge.startsOn)} to {formatDay(challenge.endsOn)}
              </p>
              {challenge.joined ? (
                <p>You have joined</p>
              ) : (
                <Button type="button" disabled={busyId === challenge.id} onClick={() => void onJoin(challenge)}>
                  {busyId === challenge.id ? "Joining…" : "Join"}
                </Button>
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </AppShell>
  );
}
