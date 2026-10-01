import { useCallback, useEffect, useState } from "react";
import { AppShell, Button, EmptyState, ErrorState, LoadingState, type AppNavItem } from "@emeris/ui";
import { getActivitySummary, type ActivitySummary } from "./api";
import "./home.css";
import type { MemberScreen } from "./navigation";
import type { MemberSession } from "./session";

type HomeScreenProps = {
  session: MemberSession;
  nav: AppNavItem[];
  onSignOut: () => void;
  onNavigate: (screen: MemberScreen) => void;
};

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function HomeScreen({ session, nav, onSignOut, onNavigate }: HomeScreenProps) {
  const [summary, setSummary] = useState<ActivitySummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    return getActivitySummary(session.accessToken)
      .then((next) => {
        setSummary(next);
      })
      .catch((caught: unknown) => {
        const message = caught instanceof Error ? caught.message : "Could not load your activity.";
        if (message === "UNAUTHENTICATED") {
          onSignOut();
          return;
        }
        setError(message);
        setSummary(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [session.accessToken, onSignOut]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <AppShell area="Member" nav={nav} onSignOut={onSignOut}>
      <header className="home-heading">
        <h1>Hello, {session.user.firstName}</h1>
        <p>Your activity at Emeris Pulse.</p>
      </header>
      <div className="home-cta-row" role="group" aria-label="Quick actions">
        <Button type="button" onClick={() => onNavigate("access")}>
          Show QR
        </Button>
        <Button type="button" variant="secondary" onClick={() => onNavigate("classes")}>
          Browse classes
        </Button>
        <Button type="button" variant="secondary" onClick={() => onNavigate("equipment")}>
          Use equipment
        </Button>
      </div>
      {loading ? <LoadingState title="Loading activity" message="Fetching your visits, classes, and challenges." /> : null}
      {error ? (
        <ErrorState
          title="Could not load activity"
          message={error}
          action={
            <Button type="button" onClick={() => void load()}>
              Retry
            </Button>
          }
        />
      ) : null}
      {summary ? (
        <>
          {summary.prompts.length > 0 ? (
            <section className="workday-prompts" aria-labelledby="workday-prompts-heading">
              <h2 id="workday-prompts-heading">Workday prompts</h2>
              <ul>
                {summary.prompts.map((prompt) => {
                  const target: MemberScreen = prompt.kind === "wellness" ? "wellness" : "classes";
                  return (
                    <li key={`${prompt.kind}-${prompt.title}`}>
                      <button type="button" className="workday-prompt" onClick={() => onNavigate(target)}>
                        <strong>{prompt.title}</strong>
                        <span>{prompt.message}</span>
                      </button>
                    </li>
                  );
                })}
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
              <EmptyState
                title="No activity yet"
                message="Visits, classes, equipment, and challenges will show here."
                action={
                  <Button type="button" onClick={() => onNavigate("classes")}>
                    Browse classes
                  </Button>
                }
              />
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
