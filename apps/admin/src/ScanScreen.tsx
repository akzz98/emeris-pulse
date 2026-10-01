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
const autoResumeMs = 2500;

export function ScanScreen({ nav, onSignOut }: ScanScreenProps) {
  // Camera reads the member QR when the desk has a webcam. Paste remains for when it does not.
  // After a grant or refuse the scanner pauses so the same code cannot flip the result.
  const [token, setToken] = useState("");
  const [granted, setGranted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraBusy, setCameraBusy] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [awaitingNext, setAwaitingNext] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const redeemLockRef = useRef(false);
  const awaitingNextRef = useRef(false);
  const autoResumeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      clearAutoResume();
      void stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function clearAutoResume() {
    if (autoResumeTimerRef.current !== null) {
      window.clearTimeout(autoResumeTimerRef.current);
      autoResumeTimerRef.current = null;
    }
  }

  function scheduleAutoResume() {
    clearAutoResume();
    autoResumeTimerRef.current = window.setTimeout(() => {
      void readyForNext();
    }, autoResumeMs);
  }

  async function pauseScanner() {
    const scanner = scannerRef.current;
    if (!scanner || !scanner.isScanning) {
      return;
    }
    try {
      scanner.pause(true);
    } catch {
      // Stopping still prevents a second decode if pause is unavailable.
      await stopCamera();
    }
  }

  async function resumeScanner() {
    const scanner = scannerRef.current;
    if (!scanner) {
      return;
    }
    try {
      scanner.resume();
      setCameraOn(true);
    } catch {
      // If resume fails after a full stop, leave Start camera available.
      setCameraOn(false);
    }
  }

  async function readyForNext() {
    clearAutoResume();
    setGranted(false);
    setError(null);
    setToken("");
    awaitingNextRef.current = false;
    setAwaitingNext(false);
    redeemLockRef.current = false;
    if (scannerRef.current) {
      await resumeScanner();
    }
  }

  async function redeem(code: string) {
    const trimmed = code.trim();
    // Refs guard camera callbacks that close over an older render.
    if (!trimmed || redeemLockRef.current || awaitingNextRef.current) {
      return;
    }
    redeemLockRef.current = true;
    setBusy(true);
    setGranted(false);
    setError(null);
    // Stop decoding immediately so a held QR cannot overwrite grant with "already used".
    await pauseScanner();
    try {
      await redeemPass(trimmed);
      setGranted(true);
      setToken("");
      awaitingNextRef.current = true;
      setAwaitingNext(true);
      scheduleAutoResume();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The scan could not be recorded.");
      awaitingNextRef.current = true;
      setAwaitingNext(true);
      scheduleAutoResume();
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await redeem(token);
  }

  async function stopCamera() {
    clearAutoResume();
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
    awaitingNextRef.current = false;
    setAwaitingNext(false);
    clearAutoResume();
    redeemLockRef.current = false;
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

  const scanNextButton = (
    <Button type="button" variant="secondary" disabled={busy} onClick={() => void readyForNext()}>
      Scan next
    </Button>
  );

  return (
    <AppShell area="Admin" nav={nav} onSignOut={onSignOut}>
      <div className="scan-page">
        <header className="scan-heading">
          <h1>Scan entry</h1>
          <p className="scan-note">
            Point the desk camera at the member’s QR pass, or paste the signed code. Each scan is stored as an access
            event. After a result the camera pauses until Scan next.
          </p>
        </header>
        {granted ? (
          <SuccessBanner
            title="Entry granted"
            message="The scan was recorded. Ready for the next member."
            action={scanNextButton}
          />
        ) : null}
        {error ? (
          <ErrorState title="Entry refused" message={error} action={scanNextButton} />
        ) : null}
        {cameraError ? <ErrorState title="Camera unavailable" message={cameraError} /> : null}

        <section className="scan-camera" aria-labelledby="scan-camera-heading">
          <h2 id="scan-camera-heading">Camera</h2>
          <p>
            {awaitingNext
              ? "Scanner paused. Scan next resumes for the next member, or wait a moment for auto-resume."
              : "Use the desk webcam when one is available. Stop the camera when you are done."}
          </p>
          <div id={readerId} className="scan-reader" />
          <div className="scan-camera-actions">
            {cameraOn ? (
              <Button type="button" variant="secondary" disabled={cameraBusy} onClick={() => void stopCamera()}>
                {cameraBusy ? "Stopping…" : "Stop camera"}
              </Button>
            ) : (
              <Button type="button" disabled={cameraBusy || busy || awaitingNext} onClick={() => void startCamera()}>
                {cameraBusy ? "Starting…" : "Start camera"}
              </Button>
            )}
            {awaitingNext ? scanNextButton : null}
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
            disabled={awaitingNext || busy}
          />
          <Button type="submit" disabled={busy || awaitingNext || !token.trim()}>
            {busy ? "Recording scan…" : "Redeem pass"}
          </Button>
        </form>
      </div>
    </AppShell>
  );
}
