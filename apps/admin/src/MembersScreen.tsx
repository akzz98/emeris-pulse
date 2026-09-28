import { useEffect, useState } from "react";
import { AppShell, Button, EmptyState, ErrorState, LoadingState, type AppNavItem } from "@emeris/ui";
import { approveMembership, getPendingMemberships, type AdminSession, type PendingMembership } from "./api";
import "./members.css";

type MembersScreenProps = {
  session: AdminSession;
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

export function MembersScreen({ session, nav, onSignOut }: MembersScreenProps) {
  const [memberships, setMemberships] = useState<PendingMembership[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  async function load() {
    const next = await getPendingMemberships(session.accessToken);
    setMemberships(next.memberships);
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
        const message = caught instanceof Error ? caught.message : "Could not load memberships waiting for approval.";
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

  async function onApprove(membership: PendingMembership) {
    setBusyId(membership.userId);
    setError(null);
    setNotice(null);
    try {
      await approveMembership(session.accessToken, membership.userId);
      await load();
      setNotice(`${membership.firstName} ${membership.lastName} can now enter the gym.`);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Could not approve this membership.";
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
    <AppShell area="Admin" nav={nav} onSignOut={onSignOut}>
      <header className="members-heading">
        <h1>Members</h1>
        <p>New profiles stay pending until a gym administrator approves them.</p>
      </header>
      {loading ? <LoadingState title="Loading members" message="Checking who is waiting for approval." /> : null}
      {error ? <ErrorState title="Membership not approved" message={error} /> : null}
      {notice ? (
        <p className="members-notice" role="status">
          {notice}
        </p>
      ) : null}
      {memberships && memberships.length === 0 ? (
        <EmptyState title="No one is waiting" message="Every new profile has been approved." />
      ) : null}
      {memberships && memberships.length > 0 ? (
        <ul className="members-list">
          {memberships.map((membership) => (
            <li key={membership.userId}>
              <h2>
                {membership.firstName} {membership.lastName}
              </h2>
              <p>{membership.email}</p>
              <p>
                {membership.campusIdentifier} · {membership.memberType} · expires {formatDay(membership.expiryDate)}
              </p>
              <p>Waiting for approval</p>
              <Button type="button" disabled={busyId !== null} onClick={() => void onApprove(membership)}>
                {busyId === membership.userId ? "Approving…" : "Approve"}
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </AppShell>
  );
}
