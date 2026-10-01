import { useEffect, useMemo, useState } from "react";
import { AppShell, Button, ConfirmDialog, EmptyState, ErrorState, LoadingState, SuccessBanner, TextField, type AppNavItem } from "@emeris/ui";
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

type MembersTab = "pending" | "active" | "frozen";

function formatDay(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
}

function matchesSearch(membership: DeskMembership, query: string): boolean {
  if (!query) {
    return true;
  }
  const haystack = `${membership.firstName} ${membership.lastName} ${membership.email} ${membership.campusIdentifier}`.toLowerCase();
  return haystack.includes(query);
}

export function MembersScreen({ session, nav, onSignOut }: MembersScreenProps) {
  const [pending, setPending] = useState<DeskMembership[] | null>(null);
  const [activeMembers, setActiveMembers] = useState<DeskMembership[] | null>(null);
  const [frozen, setFrozen] = useState<DeskMembership[] | null>(null);
  const [tab, setTab] = useState<MembersTab>("pending");
  const [search, setSearch] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ title: string; message: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [pendingFreeze, setPendingFreeze] = useState<DeskMembership | null>(null);

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
          setLoadError(null);
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
        setLoadError(message);
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
    setPendingFreeze(null);
    setActionError(null);
    setSuccess(null);
    const name = `${membership.firstName} ${membership.lastName}`;
    try {
      if (action === "freeze") {
        await freezeMembership(session.accessToken, membership.userId);
      } else {
        await approveMembership(session.accessToken, membership.userId);
      }
      await load();
      if (action === "freeze") {
        setSuccess({
          title: "Membership frozen",
          message: `${name} is frozen and cannot enter until the membership is activated again.`,
        });
      } else if (action === "activate") {
        setSuccess({ title: "Membership activated", message: `${name} can enter the gym again.` });
      } else {
        setSuccess({ title: "Membership approved", message: `${name} can now enter the gym.` });
      }
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Could not update this membership.";
      if (message === "UNAUTHENTICATED") {
        onSignOut();
        return;
      }
      setActionError(message);
    } finally {
      setBusyId(null);
    }
  }

  const query = search.trim().toLowerCase();
  const groups = useMemo(
    () => ({
      pending: {
        title: "Pending",
        emptyTitle: "No pending memberships",
        emptyMessage: "New registrations waiting for approval appear here.",
        memberships: (pending ?? []).filter((item) => matchesSearch(item, query)),
        action: "approve" as const,
        label: "Approve",
        busy: "Approving…",
        detail: "Waiting for approval",
      },
      active: {
        title: "Active",
        emptyTitle: "No active memberships",
        emptyMessage: "Approved members who can enter appear here.",
        memberships: (activeMembers ?? []).filter((item) => matchesSearch(item, query)),
        action: "freeze" as const,
        label: "Freeze",
        busy: "Freezing…",
        detail: "Can enter the gym",
      },
      frozen: {
        title: "Frozen",
        emptyTitle: "No frozen memberships",
        emptyMessage: "Frozen members who cannot enter appear here.",
        memberships: (frozen ?? []).filter((item) => matchesSearch(item, query)),
        action: "activate" as const,
        label: "Activate",
        busy: "Activating…",
        detail: "Cannot enter until activated",
      },
    }),
    [pending, activeMembers, frozen, query],
  );

  const current = groups[tab];

  return (
    <AppShell area="Admin" nav={nav} onSignOut={onSignOut}>
      <header className="members-heading">
        <h1>Members</h1>
        <p>Approve a new profile, freeze an active membership, or activate a frozen one.</p>
      </header>
      {loading ? <LoadingState title="Loading members" message="Checking pending, active, and frozen memberships." /> : null}
      {loadError ? <ErrorState title="Could not load members" message={loadError} /> : null}
      {actionError ? <ErrorState title="Membership not updated" message={actionError} /> : null}
      {success ? <SuccessBanner title={success.title} message={success.message} /> : null}
      {!loading && pending && activeMembers && frozen ? (
        <>
          <div className="members-tabs" role="tablist" aria-label="Membership status">
            {(
              [
                ["pending", `Pending (${pending.length})`],
                ["active", `Active (${activeMembers.length})`],
                ["frozen", `Frozen (${frozen.length})`],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                className={tab === id ? "is-active" : undefined}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </div>
          <TextField
            id="members-search"
            label="Search members"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Name, email, or campus identifier"
          />
          <section className="members-section" role="tabpanel" aria-label={current.title}>
            {current.memberships.length === 0 ? (
              <EmptyState title={current.emptyTitle} message={current.emptyMessage} />
            ) : (
              <ul className="members-list">
                {current.memberships.map((membership) => (
                  <li key={membership.userId}>
                    <h3>
                      {membership.firstName} {membership.lastName}
                    </h3>
                    <p>{membership.email}</p>
                    <p>
                      {membership.campusIdentifier} · {membership.memberType} · expires {formatDay(membership.expiryDate)}
                    </p>
                    <p>{current.detail}</p>
                    <Button
                      type="button"
                      variant={current.action === "freeze" ? "danger" : "primary"}
                      disabled={busyId !== null}
                      onClick={() => {
                        if (current.action === "freeze") {
                          setPendingFreeze(membership);
                          return;
                        }
                        void run(membership, current.action);
                      }}
                    >
                      {busyId === membership.userId ? current.busy : current.label}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}
      <ConfirmDialog
        open={pendingFreeze !== null}
        title="Freeze this membership?"
        message={
          pendingFreeze
            ? `${pendingFreeze.firstName} ${pendingFreeze.lastName} will not be able to enter, book, or start equipment until the membership is activated again.`
            : ""
        }
        confirmLabel="Freeze membership"
        cancelLabel="Keep active"
        confirmVariant="danger"
        busy={pendingFreeze !== null && busyId === pendingFreeze.userId}
        onCancel={() => setPendingFreeze(null)}
        onConfirm={() => {
          if (pendingFreeze) {
            void run(pendingFreeze, "freeze");
          }
        }}
      />
    </AppShell>
  );
}
