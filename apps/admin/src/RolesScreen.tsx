import { useEffect, useState } from "react";
import { ROLES, type Role } from "@emeris/shared";
import { AppShell, Button, ErrorState, LoadingState, Select, SuccessBanner, type AppNavItem } from "@emeris/ui";
import { assignAccountRole, getAccounts, type AdminSession, type DirectoryAccount } from "./api";
import "./roles.css";

type RolesScreenProps = {
  session: AdminSession;
  nav: AppNavItem[];
  onSignOut: () => void;
};

const roleLabels: Record<Role, string> = {
  Student: "Student",
  Staff: "Staff",
  Instructor: "Instructor",
  GymAdmin: "Gym admin",
  FacilityManager: "Facility manager",
  SystemAdmin: "System admin",
};

export function RolesScreen({ session, nav, onSignOut }: RolesScreenProps) {
  const [accounts, setAccounts] = useState<DirectoryAccount[] | null>(null);
  const [drafts, setDrafts] = useState<Record<number, Role>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ title: string; message: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getAccounts(session.accessToken)
      .then((body) => {
        if (!active) {
          return;
        }
        setAccounts(body.users);
        setDrafts(Object.fromEntries(body.users.map((account) => [account.id, account.role])));
        setLoadError(null);
      })
      .catch((caught: unknown) => {
        if (!active) {
          return;
        }
        const message = caught instanceof Error ? caught.message : "Could not load accounts.";
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
  }, [session.accessToken, onSignOut]);

  async function onSave(account: DirectoryAccount) {
    const role = drafts[account.id] ?? account.role;
    setBusyId(account.id);
    setActionError(null);
    setSuccess(null);
    try {
      const updated = await assignAccountRole(session.accessToken, account.id, role);
      setAccounts((current) =>
        current?.map((item) => (item.id === account.id ? { ...item, role: updated.role } : item)) ?? null,
      );
      setSuccess({
        title: "Role changed",
        message: `${account.firstName} ${account.lastName} is now ${roleLabels[updated.role]}.`,
      });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Could not change this role.";
      if (message === "UNAUTHENTICATED") {
        onSignOut();
        return;
      }
      setActionError(message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AppShell area="Admin" nav={nav} onSignOut={onSignOut}>
      <header className="roles-heading">
        <h1>Roles</h1>
        <p>A system administrator chooses what each account can open. Your own role stays as it is.</p>
      </header>
      {loading ? <LoadingState title="Loading accounts" message="Reading the campus directory." /> : null}
      {loadError ? <ErrorState title="Could not load accounts" message={loadError} /> : null}
      {actionError ? <ErrorState title="Role not changed" message={actionError} /> : null}
      {success ? <SuccessBanner title={success.title} message={success.message} /> : null}
      {accounts ? (
        <ul className="roles-list">
          {accounts.map((account) => {
            const mine = account.id === session.user.id;
            const draft = drafts[account.id] ?? account.role;
            return (
              <li key={account.id}>
                <h2>
                  {account.firstName} {account.lastName}
                </h2>
                <p>{account.email}</p>
                <p>{account.campusIdentifier}</p>
                {mine ? <p>This is your account. {roleLabels[account.role]}</p> : null}
                {mine ? null : (
                  <>
                    <Select
                      id={`role-${account.id}`}
                      label="Role"
                      value={draft}
                      onChange={(event) =>
                        setDrafts((current) => ({ ...current, [account.id]: event.target.value as Role }))
                      }
                    >
                      {ROLES.map((role) => (
                        <option key={role} value={role}>
                          {roleLabels[role]}
                        </option>
                      ))}
                    </Select>
                    <Button type="button" disabled={busyId !== null || draft === account.role} onClick={() => void onSave(account)}>
                      {busyId === account.id ? "Saving…" : "Save role"}
                    </Button>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      ) : null}
    </AppShell>
  );
}
