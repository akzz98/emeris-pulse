import { useEffect, useState } from "react";
import { AppShell, ErrorState, LoadingState, type AppNavItem } from "@emeris/ui";
import { getActivitySummary, type ActivitySummary } from "./api";
import "./home.css";
import type { MemberSession } from "./session";

type HomeScreenProps = {
  session: MemberSession;
  nav: AppNavItem[];
  onSignOut: () => void;
};

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function HomeScreen({ session, nav, onSignOut }: HomeScreenProps) {
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
    <AppShell area="Member" nav={nav} onSignOut={onSignOut}>
      <header className="home-heading">
        <h1>Hello, {session.user.firstName}</h1>
        <p>Your activity at Emeris Pulse.</p>
      </header>
      {loading ? <LoadingState title="Loading activity" message="Fetching your visits, classes, and challenges." /> : null}
      {error ? <ErrorState title="Activity unavailable" message={error} /> : null}
      {summary ? (
        <>
          {summary.prompts.length > 0 ? (
            <section className="workday-prompts" aria-labelledby="workday-prompts-heading">
              <h2 id="workday-prompts-heading">Workday prompts</h2>
              <ul>
                {summary.prompts.map((prompt) => (
                  <li key={`${prompt.kind}-${prompt.title}`}>
                    <p>
                      <strong>{prompt.title}</strong>
                      <span>{prompt.message}</span>
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <section aria-labelledby="activity-summary-heading">
            <h2 id="activity-summary-heading" className="visually-hidden">
              Activity summary
            </h2>
            <p className="streak-note">
              {summary.streak === 1 ? "1 day" : `${summary.streak} days`} in a row with a gym visit or a class.
            </p>
            <dl className="activity-stats">
              <div>
                <dt>Streak</dt>
                <dd>{summary.streak}</dd>
              </div>
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
    </AppShell>
  );
}
