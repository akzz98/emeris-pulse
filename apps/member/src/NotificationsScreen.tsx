import { useEffect, useState } from "react";
import { AppShell, EmptyState, ErrorState, LoadingState, type AppNavItem } from "@emeris/ui";
import { getMyNotices, type MemberNotice } from "./api";
import "./notices.css";
import type { MemberSession } from "./session";

type NotificationsScreenProps = {
  session: MemberSession;
  nav: AppNavItem[];
  onSignOut: () => void;
};

function formatWhen(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function NotificationsScreen({ session, nav, onSignOut }: NotificationsScreenProps) {
  const [notices, setNotices] = useState<MemberNotice[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getMyNotices(session.accessToken)
      .then((next) => {
        if (!active) {
          return;
        }
        setNotices(next.notices);
        setError(null);
      })
      .catch((caught: unknown) => {
        if (!active) {
          return;
        }
        const message = caught instanceof Error ? caught.message : "Could not load notices.";
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
      <header className="notices-heading">
        <h1>Notifications</h1>
        <p>Class reminders, changes, and campus messages stay in the app.</p>
      </header>
      {loading ? <LoadingState title="Loading notices" message="Checking messages for your account." /> : null}
      {error ? <ErrorState title="Notices unavailable" message={error} /> : null}
      {notices && notices.length === 0 ? (
        <EmptyState title="No notices" message="When the gym or an instructor writes to you, it appears here." />
      ) : null}
      {notices && notices.length > 0 ? (
        <ul className="notices-list">
          {notices.map((item) => (
            <li key={item.id}>
              <h2>{item.title}</h2>
              <p>{item.body}</p>
              <p>
                {formatWhen(item.createdAt)}
                {item.read ? "" : " · New"}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
    </AppShell>
  );
}
