import { FormEvent, useState } from "react";
import { AppShell, Button, ErrorState, SuccessBanner, TextArea, type AppNavItem } from "@emeris/ui";
import { redeemPass } from "./api";
import "./scan.css";

type ScanScreenProps = {
  nav: AppNavItem[];
  onSignOut: () => void;
};

export function ScanScreen({ nav, onSignOut }: ScanScreenProps) {
  // The entrance screen redeems the signed code from the member's pass.
  const [token, setToken] = useState("");
  const [granted, setGranted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setGranted(false);
    setError(null);
    try {
      await redeemPass(token.trim());
      setGranted(true);
      setToken("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The scan could not be recorded.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell area="Admin" nav={nav} onSignOut={onSignOut}>
      <form className="scan-form" onSubmit={onSubmit}>
        <h1>Scan entry</h1>
        <p className="scan-note">Paste the member’s signed pass. Each scan is stored as an access event.</p>
        {granted ? <SuccessBanner title="Entry granted" message="The scan was recorded." /> : null}
        {error ? <ErrorState title="Entry refused" message={error} /> : null}
        <TextArea
          id="pass-token"
          label="Pass code"
          value={token}
          onChange={(event) => setToken(event.target.value)}
          required
          rows={5}
          spellCheck={false}
          autoComplete="off"
          hint="Paste the full signed code from the member’s phone."
        />
        <Button type="submit" disabled={busy}>
          {busy ? "Recording scan…" : "Redeem pass"}
        </Button>
      </form>
    </AppShell>
  );
}
