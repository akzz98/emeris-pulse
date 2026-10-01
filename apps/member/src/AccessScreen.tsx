import { useEffect, useState } from "react";
import { AppShell, Button, ErrorState, LoadingState, StatusBadge, type AppNavItem, type StatusTone } from "@emeris/ui";
import QRCode from "qrcode";
import { getMembership, issueAccessPass, type AccessPass, type MembershipDetails } from "./api";
import "./access.css";
import type { MemberSession } from "./session";

type AccessScreenProps = {
  session: MemberSession;
  nav: AppNavItem[];
  onSignOut: () => void;
};

function secondsLeft(expiresAt: string): number {
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000));
}

function eligibilityTone(status: MembershipDetails["status"], canEnter: boolean): StatusTone {
  if (canEnter) {
    return "success";
  }
  if (status === "Pending") {
    return "warning";
  }
  return "danger";
}

function eligibilityLabel(membership: MembershipDetails): string {
  if (membership.canEnter) {
    return "Active — eligible to enter";
  }
  if (membership.status === "Pending") {
    return "Pending — waiting for activation";
  }
  if (membership.status === "Frozen") {
    return "Frozen — entry refused";
  }
  return "Expired — entry refused";
}

export function AccessScreen({ session, nav, onSignOut }: AccessScreenProps) {
  const [membership, setMembership] = useState<MembershipDetails | null>(null);
  const [pass, setPass] = useState<AccessPass | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [membershipError, setMembershipError] = useState<string | null>(null);

  async function loadPass() {
    setLoading(true);
    setError(null);
    setPass(null);
    setImage(null);
    try {
      const next = await issueAccessPass(session.accessToken);
      // The QR holds the signed token. The gym scanner reads that token, not a membership number.
      const dataUrl = await QRCode.toDataURL(next.token, { margin: 1, width: 240 });
      setPass(next);
      setImage(dataUrl);
      setRemaining(secondsLeft(next.expiresAt));
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Could not issue a pass.";
      if (message === "UNAUTHENTICATED") {
        onSignOut();
        return;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    getMembership(session.accessToken)
      .then((next) => {
        if (active) {
          setMembership(next);
          setMembershipError(null);
        }
      })
      .catch((caught: unknown) => {
        if (!active) {
          return;
        }
        const message = caught instanceof Error ? caught.message : "Could not load membership.";
        if (message === "UNAUTHENTICATED") {
          onSignOut();
          return;
        }
        setMembershipError(message);
      });
    void loadPass();
    // Issue once when the screen opens. A new pass is requested from the button.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.accessToken]);

  useEffect(() => {
    if (!pass) {
      return;
    }
    const timer = window.setInterval(() => setRemaining(secondsLeft(pass.expiresAt)), 1000);
    return () => window.clearInterval(timer);
  }, [pass]);

  const expired = pass !== null && remaining === 0;

  return (
    <AppShell area="Member" nav={nav} onSignOut={onSignOut}>
      <header className="access-heading">
        <h1>Access</h1>
        <p>Show this pass at the gym entrance. Students and staff use the same pass.</p>
      </header>
      {membership ? (
        <p className="access-eligibility" role="status">
          <StatusBadge
            label={eligibilityLabel(membership)}
            tone={eligibilityTone(membership.status, membership.canEnter)}
          />
        </p>
      ) : null}
      {membershipError ? <ErrorState title="Could not load membership" message={membershipError} /> : null}
      {loading ? <LoadingState title="Issuing pass" message="Signing a short-lived access code." /> : null}
      {error ? <ErrorState title="Could not issue pass" message={error} /> : null}
      {image && pass && !expired ? (
        <section className="access-pass" aria-labelledby="access-pass-heading">
          <h2 id="access-pass-heading" className="visually-hidden">
            Access pass
          </h2>
          <img src={image} alt="Signed gym access pass" width={240} height={240} />
          <p role="status">Expires in {remaining} seconds.</p>
        </section>
      ) : null}
      {expired ? (
        <ErrorState title="Pass expired" message="This code is no longer valid. Issue a new one before you enter." />
      ) : null}
      {!loading && (error || expired) ? (
        <div className="access-actions">
          <Button onClick={() => void loadPass()}>New pass</Button>
        </div>
      ) : null}
    </AppShell>
  );
}
