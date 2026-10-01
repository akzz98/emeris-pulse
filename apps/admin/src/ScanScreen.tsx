import { FormEvent, useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { AppShell, Button, ErrorState, SuccessBanner, TextArea, type AppNavItem } from "@emeris/ui";
import { redeemPass } from "./api";
import "./scan.css";

type ScanScreenProps = {
  nav: AppNavItem[];
  onSignOut: () => void;
};

const readerId = "desk-qr-reader";

export function ScanScreen({ nav, onSignOut }: ScanScreenProps) {
  // Camera reads the member QR when the desk has a webcam. Paste remains for when it does not.
  const [token, setToken] = useState("");
  const [granted, setGranted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraBusy, setCameraBusy] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const redeemLockRef = useRef(false);

  useEffect(() => {
    return () => {
      void stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function redeem(code: string) {
    const trimmed = code.trim();
    if (!trimmed || redeemLockRef.current) {
      return;
    }
    redeemLockRef.current = true;
    setBusy(true);
    setGranted(false);
    setError(null);
    try {
      await redeemPass(trimmed);
      setGranted(true);
      setToken("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The scan could not be recorded.");
    } finally {
      setBusy(false);
      window.setTimeout(() => {
        redeemLockRef.current = false;
      }, 1500);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await redeem(token);
  }

  async function stopCamera() {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    setCameraOn(false);
    if (!scanner) {
      return;
    }
    try {
      if (scanner.isScanning) {
        await scanner.stop();
      }
      scanner.clear();
    } catch {
      // Stopping after unmount can throw; the element is already gone.
    }
  }

  async function startCamera() {
    setCameraBusy(true);
    setCameraError(null);
    setError(null);
    setGranted(false);
    try {
      await stopCamera();
      const scanner = new Html5Qrcode(readerId);
      scannerRef.current = scanner;
      const onScan = (decoded: string) => {
        void redeem(decoded);
      };
      try {
        await scanner.start({ facingMode: "environment" }, { fps: 8, qrbox: { width: 240, height: 240 } }, onScan, () => undefined);
      } catch {
        await scanner.start({ facingMode: "user" }, { fps: 8, qrbox: { width: 240, height: 240 } }, onScan, () => undefined);
      }
      setCameraOn(true);
    } catch (caught) {
      scannerRef.current = null;
      setCameraOn(false);
      const message =
        caught instanceof Error
          ? caught.message
          : "Camera could not start. Paste the pass code instead.";
      setCameraError(message);
    } finally {
      setCameraBusy(false);
    }
  }

  return (
    <AppShell area="Admin" nav={nav} onSignOut={onSignOut}>
      <div className="scan-page">
        <header className="scan-heading">
          <h1>Scan entry</h1>
          <p className="scan-note">
            Point the desk camera at the member’s QR pass, or paste the signed code. Each scan is stored as an access
            event.
          </p>
        </header>
        {granted ? <SuccessBanner title="Entry granted" message="The scan was recorded." /> : null}
        {error ? <ErrorState title="Entry refused" message={error} /> : null}
        {cameraError ? <ErrorState title="Camera unavailable" message={cameraError} /> : null}

        <section className="scan-camera" aria-labelledby="scan-camera-heading">
          <h2 id="scan-camera-heading">Camera</h2>
          <p>Use the desk webcam when one is available. Stop the camera when you are done.</p>
          <div id={readerId} className="scan-reader" />
          <div className="scan-camera-actions">
            {cameraOn ? (
              <Button type="button" variant="secondary" disabled={cameraBusy} onClick={() => void stopCamera()}>
                {cameraBusy ? "Stopping…" : "Stop camera"}
              </Button>
            ) : (
              <Button type="button" disabled={cameraBusy || busy} onClick={() => void startCamera()}>
                {cameraBusy ? "Starting…" : "Start camera"}
              </Button>
            )}
          </div>
        </section>

        <form className="scan-form" onSubmit={(event) => void onSubmit(event)}>
          <h2>Paste pass</h2>
          <p className="scan-note">Fallback when the camera is unavailable or the QR will not read.</p>
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
      </div>
    </AppShell>
  );
}
