import { FormEvent, useState } from "react";
import { AppShell, Button, ErrorState, TextField, type AppNavItem } from "@emeris/ui";
import QRCode from "qrcode";
import { issueTemporaryPass, type TemporaryPass } from "./api";
import "./temporary.css";
import type { AdminSession } from "./api";

type TemporaryPassScreenProps = {
  session: AdminSession;
  nav: AppNavItem[];
  onSignOut: () => void;
};

export function TemporaryPassScreen({ session, nav, onSignOut }: TemporaryPassScreenProps) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState<TemporaryPass | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setPass(null);
    setImage(null);
    try {
      const next = await issueTemporaryPass(session.accessToken, email.trim());
      const dataUrl = await QRCode.toDataURL(next.token, { margin: 1, width: 240 });
      setPass(next);
      setImage(dataUrl);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Could not issue a temporary pass.";
      if (message === "UNAUTHENTICATED") {
        onSignOut();
        return;
      }
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  const minutes = pass ? Math.round(pass.expiresIn / 60) : 0;

  return (
    <AppShell area="Admin" nav={nav} onSignOut={onSignOut}>
      <form className="temporary-form" onSubmit={onSubmit}>
        <h1>Temporary pass</h1>
        <p className="temporary-note">
          Issue a single-use pass when a member’s phone is lost. The membership must still be active.
        </p>
        {error ? <ErrorState title="Pass not issued" message={error} /> : null}
        <TextField
          id="member-email"
          label="Member email"
          type="email"
          autoComplete="off"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <Button type="submit" disabled={busy}>
          {busy ? "Issuing pass…" : "Issue temporary pass"}
        </Button>
      </form>
      {pass && image ? (
        <section className="temporary-pass" aria-labelledby="temporary-pass-heading">
          <h2 id="temporary-pass-heading">
            Pass for {pass.member.firstName} {pass.member.lastName}
          </h2>
          <img src={image} alt={`Temporary access pass for ${pass.member.firstName} ${pass.member.lastName}`} width={240} height={240} />
          <p>Valid for {minutes} minutes and one entry.</p>
        </section>
      ) : null}
    </AppShell>
  );
}
