import { useEffect, useState } from "react";
import { AppShell, Button, ErrorState, LoadingState } from "@emeris/ui";
import { getActivitySummary, type ActivitySummary } from "./api";
import "./home.css";
import type { MemberSession } from "./session";

type HomeScreenProps = {
  session: MemberSession;
  onOpenMembership: () => void;
  onOpenProfile: () => void;
  onSignOut: () => void;
};

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function HomeScreen({ session, onOpenMembership, onOpenProfile, onSignOut }: HomeScreenProps) {
  const [summary, setSummary] = useState<ActivitySummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    getActivitySummary(session.accessToken)
      .then((next) => {
        if (active) {
          setSummary(next);
        }
      })
      .catch((caught: unknown) => {
        if (!active) {
          return;
        }
        const message = caught instanceof Error ? caught.message : "Could not load your activity.";
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

  return (
    <AppShell area="Member">
      <header className="home-heading">
        <h1>Hello, {session.user.firstName}</h1>
        <p>Your activity at Emeris Pulse.</p>
      </header>
      <div className="home-links">
        <button type="button" className="text-button" onClick={onOpenMembership}>
          View membership
        </button>
        <button type="button" className="text-button" onClick={onOpenProfile}>
          View profile
        </button>
      </div>
      {loading ? <LoadingState title="Loading activity" message="Fetching your visits, classes, and challenges." /> : null}
      {error ? <ErrorState title="Activity unavailable" message={error} /> : null}
      {summary ? (
        <>
          <section aria-labelledby="activity-summary-heading">
            <h2 id="activity-summary-heading" className="visually-hidden">
              Activity summary
            </h2>
            <dl className="activity-stats">
              <div>
                <dt>Visits</dt>
                <dd>{summary.visits}</dd>
              </div>
              <div>
                <dt>Classes</dt>
                <dd>{summary.classesBooked}</dd>
              </div>
              <div>
                <dt>Equipment sessions</dt>
                <dd>{summary.equipmentSessions}</dd>
              </div>
              <div>
                <dt>Challenges</dt>
                <dd>{summary.challengesJoined}</dd>
              </div>
            </dl>
          </section>
          <section className="activity-recent" aria-labelledby="recent-activity-heading">
            <h2 id="recent-activity-heading">Recent activity</h2>
            {summary.recent.length === 0 ? (
              <p>No activity yet. Visits, classes, equipment, and challenges will show here.</p>
            ) : (
              <ul>
                {summary.recent.map((item) => (
                  <li key={`${item.kind}-${item.occurredAt}-${item.title}`}>
                    <p>
                      <strong>{item.title}</strong>
                      <span>{item.detail}</span>
                    </p>
                    <time dateTime={item.occurredAt}>{formatWhen(item.occurredAt)}</time>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}
      <div className="home-actions">
        <Button onClick={onSignOut}>Sign out</Button>
      </div>
    </AppShell>
  );
}
