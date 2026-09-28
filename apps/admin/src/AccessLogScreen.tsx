import { useEffect, useState } from "react";
import { AppShell, Button, EmptyState, ErrorState, LoadingState, type AppNavItem } from "@emeris/ui";
import { getAccessLog, type AccessLog } from "./api";
import "./log.css";
import type { AdminSession } from "./api";

type AccessLogScreenProps = {
  session: AdminSession;
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

export function AccessLogScreen({ session, nav, onSignOut }: AccessLogScreenProps) {
  const [page, setPage] = useState(1);
  const [log, setLog] = useState<AccessLog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    getAccessLog(session.accessToken, page)
      .then((next) => {
        if (active) {
          setLog(next);
        }
      })
      .catch((caught: unknown) => {
        if (!active) {
          return;
        }
        const message = caught instanceof Error ? caught.message : "Could not load the access log.";
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
  }, [session.accessToken, page, onSignOut]);

  const pageCount = log ? Math.max(1, Math.ceil(log.total / log.pageSize)) : 1;

  return (
    <AppShell area="Admin" nav={nav} onSignOut={onSignOut}>
      <header className="log-heading">
        <h1>Access logs</h1>
        <p>Who was granted or refused at the entrance.</p>
      </header>
      {loading ? <LoadingState title="Loading access log" message="Fetching the latest scans." /> : null}
      {error ? <ErrorState title="Access log unavailable" message={error} /> : null}
      {log && log.events.length === 0 ? (
        <EmptyState title="No scans yet" message="Granted and refused entry will appear here." />
      ) : null}
      {log && log.events.length > 0 ? (
        <div className="access-log">
          <table>
            <caption className="visually-hidden">Access log, page {log.page}</caption>
            <thead>
              <tr>
                <th scope="col">When</th>
                <th scope="col">Member</th>
                <th scope="col">Result</th>
                <th scope="col">Reason</th>
              </tr>
            </thead>
            <tbody>
              {log.events.map((event) => (
                <tr key={event.id}>
                  <td>
                    <time dateTime={event.occurredAt}>{formatWhen(event.occurredAt)}</time>
                  </td>
                  <td>
                    {event.firstName} {event.lastName}
                    <span>{event.email}</span>
                  </td>
                  <td>{event.result}</td>
                  <td>{event.reason ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="log-pager">
            <Button onClick={() => setPage((current) => current - 1)} disabled={page <= 1}>
              Previous
            </Button>
            <p>
              Page {log.page} of {pageCount}
            </p>
            <Button onClick={() => setPage((current) => current + 1)} disabled={page >= pageCount}>
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
