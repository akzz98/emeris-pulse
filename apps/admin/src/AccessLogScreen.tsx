import { FormEvent, useEffect, useState } from "react";
import { AppShell, Button, EmptyState, ErrorState, LoadingState, Select, TextField, type AppNavItem } from "@emeris/ui";
import { getAccessLog, type AccessLog } from "./api";
import "./log.css";
import type { AdminSession } from "./api";

type AccessLogScreenProps = {
  session: AdminSession;
  nav: AppNavItem[];
  onSignOut: () => void;
};

type ResultFilter = "" | "Granted" | "Refused";

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function AccessLogScreen({ session, nav, onSignOut }: AccessLogScreenProps) {
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<ResultFilter>("");
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [log, setLog] = useState<AccessLog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    getAccessLog(session.accessToken, page, {
      result: result || undefined,
      q: appliedQuery || undefined,
    })
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
  }, [session.accessToken, page, result, appliedQuery, onSignOut, retryTick]);

  function onSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setAppliedQuery(query.trim());
  }

  const pageCount = log ? Math.max(1, Math.ceil(log.total / log.pageSize)) : 1;

  return (
    <AppShell area="Admin" nav={nav} onSignOut={onSignOut}>
      <header className="log-heading">
        <h1>Access logs</h1>
        <p>Who was granted or refused at the entrance.</p>
      </header>
      <form className="log-filters" onSubmit={onSearch}>
        <Select
          id="log-result"
          label="Result"
          value={result}
          onChange={(event) => {
            setPage(1);
            setResult(event.target.value as ResultFilter);
          }}
        >
          <option value="">All results</option>
          <option value="Granted">Granted</option>
          <option value="Refused">Refused</option>
        </Select>
        <TextField
          id="log-search"
          label="Member search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Name or email"
          hint="Search by name or email, then press Search."
        />
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>
      {loading ? <LoadingState title="Loading access log" message="Fetching the latest scans." /> : null}
      {error ? (
        <ErrorState
          title="Could not load access log"
          message={error}
          action={
            <Button type="button" onClick={() => setRetryTick((tick) => tick + 1)}>
              Retry
            </Button>
          }
        />
      ) : null}
      {log && log.events.length === 0 ? (
        <EmptyState title="No scans match" message="Try another result filter or search, or wait for the next entrance scan." />
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
                  <td data-label="When">
                    <time dateTime={event.occurredAt}>{formatWhen(event.occurredAt)}</time>
                  </td>
                  <td data-label="Member">
                    {event.firstName} {event.lastName}
                    <span>{event.email}</span>
                  </td>
                  <td data-label="Result">{event.result}</td>
                  <td data-label="Reason">{event.reason ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="log-pager">
            <Button variant="secondary" onClick={() => setPage((current) => current - 1)} disabled={page <= 1}>
              Previous
            </Button>
            <p>
              Page {log.page} of {pageCount} · {log.total} scans · {log.pageSize} per page
            </p>
            <Button variant="secondary" onClick={() => setPage((current) => current + 1)} disabled={page >= pageCount}>
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
