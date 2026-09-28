import { useEffect, useState } from "react";
import { AppShell, Button, ErrorState, LoadingState, type AppNavItem } from "@emeris/ui";
import {
  approveMembership,
  freezeMembership,
  getActiveMemberships,
  getFrozenMemberships,
  getPendingMemberships,
  type AdminSession,
  type DeskMembership,
} from "./api";
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
  const [pending, setPending] = useState<DeskMembership[] | null>(null);
  const [activeMembers, setActiveMembers] = useState<DeskMembership[] | null>(null);
  const [frozen, setFrozen] = useState<DeskMembership[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  async function load() {
    const [waiting, current, paused] = await Promise.all([
      getPendingMemberships(session.accessToken),
      getActiveMemberships(session.accessToken),
      getFrozenMemberships(session.accessToken),
    ]);
    setPending(waiting.memberships);
    setActiveMembers(current.memberships);
    setFrozen(paused.memberships);
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
        const message = caught instanceof Error ? caught.message : "Could not load memberships.";
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

  async function run(membership: DeskMembership, action: "approve" | "freeze" | "activate") {
    setBusyId(membership.userId);
    setError(null);
    setNotice(null);
    const name = `${membership.firstName} ${membership.lastName}`;
    try {
      if (action === "freeze") {
        await freezeMembership(session.accessToken, membership.userId);
      } else {
        await approveMembership(session.accessToken, membership.userId);
      }
      await load();
      if (action === "freeze") {
        setNotice(`${name} is frozen and cannot enter until the membership is activated again.`);
      } else if (action === "activate") {
        setNotice(`${name} can enter the gym again.`);
      } else {
        setNotice(`${name} can now enter the gym.`);
      }
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Could not update this membership.";
      if (message === "UNAUTHENTICATED") {
        onSignOut();
        return;
      }
      setError(message);
    } finally {
      setBusyId(null);
    }
  }

  const groups = [
    {
      title: "Waiting for approval",
      empty: "No one is waiting.",
      memberships: pending,
      action: "approve" as const,
      label: "Approve",
      busy: "Approving…",
      detail: "Waiting for approval",
    },
    {
      title: "Active memberships",
      empty: "No active memberships.",
      memberships: activeMembers,
      action: "freeze" as const,
      label: "Freeze",
      busy: "Freezing…",
      detail: "Can enter the gym",
    },
    {
      title: "Frozen memberships",
      empty: "No frozen memberships.",
      memberships: frozen,
      action: "activate" as const,
      label: "Activate",
      busy: "Activating…",
      detail: "Cannot enter until activated",
    },
  ];

  return (
    <AppShell area="Admin" nav={nav} onSignOut={onSignOut}>
      <header className="members-heading">
        <h1>Members</h1>
        <p>Approve a new profile, freeze an active membership, or activate a frozen one.</p>
      </header>
      {loading ? <LoadingState title="Loading members" message="Checking pending, active, and frozen memberships." /> : null}
      {error ? <ErrorState title="Membership not updated" message={error} /> : null}
      {notice ? (
        <p className="members-notice" role="status">
          {notice}
        </p>
      ) : null}
      {!loading && pending && activeMembers && frozen
        ? groups.map((group) => (
            <section className="members-section" key={group.title}>
              <h2>{group.title}</h2>
              {group.memberships && group.memberships.length === 0 ? <p>{group.empty}</p> : null}
              {group.memberships && group.memberships.length > 0 ? (
                <ul className="members-list">
                  {group.memberships.map((membership) => (
                    <li key={membership.userId}>
                      <h3>
                        {membership.firstName} {membership.lastName}
                      </h3>
                      <p>{membership.email}</p>
                      <p>
                        {membership.campusIdentifier} · {membership.memberType} · expires {formatDay(membership.expiryDate)}
                      </p>
                      <p>{group.detail}</p>
                      <Button type="button" disabled={busyId !== null} onClick={() => void run(membership, group.action)}>
                        {busyId === membership.userId ? group.busy : group.label}
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))
        : null}
    </AppShell>
  );
}
