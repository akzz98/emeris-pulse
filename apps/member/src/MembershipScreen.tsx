import { useEffect, useState } from "react";
import { AppShell, Button, ErrorState, LoadingState, StatusBadge, type AppNavItem, type StatusTone } from "@emeris/ui";
import { getMembership, type MembershipDetails } from "./api";
import "./membership.css";
import type { MemberSession } from "./session";

type MembershipScreenProps = {
  session: MemberSession;
  nav: AppNavItem[];
  onSignOut: () => void;
};

// Dates arrive as yyyy-mm-dd. Build a local date so the day does not shift across time zones.
function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  if (!year || !month || !day) {
    return isoDate;
  }
  return new Date(year, month - 1, day).toLocaleDateString(undefined, { dateStyle: "long" });
}

function statusTone(status: MembershipDetails["status"], canEnter: boolean): StatusTone {
  if (canEnter) {
    return "success";
  }
  if (status === "Pending") {
    return "warning";
  }
  return "danger";
}

// Entry is allowed only while the membership is Active and not past its expiry date.
function entryMessage(membership: MembershipDetails): string {
  if (membership.canEnter) {
    return "You can enter the gym.";
  }
  if (membership.status === "Pending") {
    return "Your membership is pending. An admin must activate it before you can enter.";
  }
  if (membership.status === "Frozen") {
    return "Your membership is frozen, so you cannot enter.";
  }
  return "Your membership has expired, so you cannot enter.";
}

// Staff terms are 365 days. Student terms are 120 days. The API sends the length that applies.
function eligibilityMessage(membership: MembershipDetails): string {
  if (membership.memberType === "Staff") {
    return `Staff eligibility is separate from student eligibility. A staff membership lasts ${membership.termDays} days.`;
  }
  return `Student eligibility lasts ${membership.termDays} days.`;
}

export function MembershipScreen({ session, nav, onSignOut }: MembershipScreenProps) {
  const [membership, setMembership] = useState<MembershipDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    getMembership(session.accessToken)
      .then((next) => {
        if (active) {
          setMembership(next);
        }
      })
      .catch((caught: unknown) => {
        if (!active) {
          return;
        }
        const message = caught instanceof Error ? caught.message : "Could not load your membership.";
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
  }, [session.accessToken, onSignOut, retryTick]);

  return (
    <AppShell area="Member" nav={nav} onSignOut={onSignOut}>
      <header className="membership-heading">
        <h1>Membership</h1>
        <p>Status and expiry for {session.user.firstName}.</p>
      </header>
      {loading ? <LoadingState title="Loading membership" message="Checking your status and expiry." /> : null}
      {error ? (
        <ErrorState
          title="Membership unavailable"
          message={error}
          action={
            <Button type="button" onClick={() => setRetryTick((tick) => tick + 1)}>
              Retry
            </Button>
          }
        />
      ) : null}
      {membership ? (
        <section className="membership-card" aria-labelledby="membership-details-heading">
          <h2 id="membership-details-heading" className="visually-hidden">
            Membership details
          </h2>
          <p className={membership.canEnter ? "entry-allowed" : "entry-refused"} role="status">
            {entryMessage(membership)}
          </p>
          <dl>
            <div>
              <dt>Status</dt>
              <dd>
                <StatusBadge label={membership.status} tone={statusTone(membership.status, membership.canEnter)} />
              </dd>
            </div>
            <div>
              <dt>Type</dt>
              <dd>{membership.memberType}</dd>
            </div>
            <div>
              <dt>Starts</dt>
              <dd>{formatDate(membership.startDate)}</dd>
            </div>
            <div>
              <dt>Expires</dt>
              <dd>{formatDate(membership.expiryDate)}</dd>
            </div>
          </dl>
          <p>{eligibilityMessage(membership)}</p>
        </section>
      ) : null}
    </AppShell>
  );
}
