import { FormEvent, useEffect, useState } from "react";
import { AppShell, Button, ConfirmDialog, EmptyState, ErrorState, LoadingState, StatusBadge, SuccessBanner, TextField, type AppNavItem } from "@emeris/ui";
import {
  endEquipmentSession,
  getCurrentEquipmentSession,
  getEquipment,
  reportEquipmentFault,
  reportEquipmentFaultByCode,
  startEquipmentSession,
  type EquipmentSession,
  type FloorMachine,
} from "./api";
import "./equipment.css";
import type { MemberSession } from "./session";

type EquipmentScreenProps = {
  session: MemberSession;
  nav: AppNavItem[];
  onSignOut: () => void;
};

function formatWhen(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export function EquipmentScreen({ session, nav, onSignOut }: EquipmentScreenProps) {
  const [machines, setMachines] = useState<FloorMachine[] | null>(null);
  const [open, setOpen] = useState<EquipmentSession | null>(null);
  const [code, setCode] = useState("");
  const [fault, setFault] = useState("");
  const [faultCode, setFaultCode] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ title: string; message: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"start" | "end" | "report" | null>(null);
  const [confirmEnd, setConfirmEnd] = useState(false);

  async function load() {
    const [floor, current] = await Promise.all([
      getEquipment(session.accessToken),
      getCurrentEquipmentSession(session.accessToken),
    ]);
    setMachines(floor.equipment);
    setOpen(current.session);
  }

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(null);
    load()
      .catch((caught: unknown) => {
        if (!active) {
          return;
        }
        const message = caught instanceof Error ? caught.message : "Could not load the equipment.";
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
    // Load once for this sign-in. Start and end refresh the floor themselves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.accessToken, onSignOut]);

  async function startWithCode(machineCode: string) {
    setBusy("start");
    setActionError(null);
    setSuccess(null);
    try {
      const started = await startEquipmentSession(session.accessToken, machineCode);
      await load();
      setCode("");
      setSuccess({ title: "Session started", message: `${started.name} session started.` });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Could not start this machine.";
      if (message === "UNAUTHENTICATED") {
        onSignOut();
        return;
      }
      setActionError(message);
    } finally {
      setBusy(null);
    }
  }

  async function onStart(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await startWithCode(code);
  }

  async function onReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("report");
    setActionError(null);
    setSuccess(null);
    try {
      const ticket = open
        ? await reportEquipmentFault(session.accessToken, fault)
        : await reportEquipmentFaultByCode(session.accessToken, faultCode, fault);
      setFault("");
      setFaultCode("");
      setSuccess({ title: "Fault reported", message: `A maintenance ticket is open for ${ticket.name}.` });
      await load();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Could not report this fault.";
      if (message === "UNAUTHENTICATED") {
        onSignOut();
        return;
      }
      setActionError(message);
    } finally {
      setBusy(null);
    }
  }

  async function onEndConfirmed() {
    setBusy("end");
    setConfirmEnd(false);
    setActionError(null);
    setSuccess(null);
    try {
      await endEquipmentSession(session.accessToken);
      await load();
      setSuccess({ title: "Session ended", message: "Your equipment session has ended." });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Could not end this session.";
      if (message === "UNAUTHENTICATED") {
        onSignOut();
        return;
      }
      setActionError(message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <AppShell area="Member" nav={nav} onSignOut={onSignOut}>
      <header className="equipment-heading">
        <h1>Equipment</h1>
        <p>Enter the code on the machine to start a session, or report a fault with the machine code. Out-of-service machines cannot be started.</p>
      </header>
      {loading ? <LoadingState title="Loading equipment" message="Checking the floor and your session." /> : null}
      {loadError ? <ErrorState title="Could not load equipment" message={loadError} /> : null}
      {actionError ? <ErrorState title="Equipment not updated" message={actionError} /> : null}
      {success ? <SuccessBanner title={success.title} message={success.message} /> : null}
      {open ? (
        <section className="equipment-open" aria-labelledby="open-session-heading">
          <h2 id="open-session-heading">
            Open session · {open.name} ({open.code})
          </h2>
          <p>
            Started at {formatWhen(open.startedAt)} · {open.location}
          </p>
          <div className="equipment-open-actions">
            <Button type="button" variant="danger" disabled={busy !== null} onClick={() => setConfirmEnd(true)}>
              {busy === "end" ? "Ending…" : "End session"}
            </Button>
          </div>
          <form className="equipment-fault" onSubmit={(event) => void onReport(event)}>
            <TextField
              id="fault-description"
              label="What is wrong?"
              value={fault}
              onChange={(event) => setFault(event.target.value)}
              maxLength={400}
              required
            />
            <Button type="submit" disabled={busy !== null}>
              {busy === "report" ? "Sending…" : "Report a fault"}
            </Button>
          </form>
        </section>
      ) : (
        <>
          <form className="equipment-form" onSubmit={(event) => void onStart(event)}>
            <TextField
              id="machine-code"
              label="Machine code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              autoComplete="off"
              required
            />
            <Button type="submit" disabled={busy !== null}>
              {busy === "start" ? "Starting…" : "Start session"}
            </Button>
          </form>
          <section className="equipment-report-free" aria-labelledby="report-without-session-heading">
            <h2 id="report-without-session-heading">Report a fault</h2>
            <p>You can open a ticket with the machine code. You do not need to start a session first.</p>
            <form className="equipment-fault" onSubmit={(event) => void onReport(event)}>
              <TextField
                id="fault-machine-code"
                label="Machine code"
                value={faultCode}
                onChange={(event) => setFaultCode(event.target.value)}
                autoComplete="off"
                required
              />
              <TextField
                id="fault-description-free"
                label="What is wrong?"
                value={fault}
                onChange={(event) => setFault(event.target.value)}
                maxLength={400}
                required
              />
              <Button type="submit" disabled={busy !== null}>
                {busy === "report" ? "Sending…" : "Report a fault"}
              </Button>
            </form>
          </section>
        </>
      )}
      {machines && machines.length === 0 ? (
        <EmptyState title="No machines" message="There is no equipment on the floor yet." />
      ) : null}
      {machines && machines.length > 0 ? (
        <ul className="equipment-list">
          {machines.map((machine) => (
            <li key={machine.id}>
              <h2>{machine.name}</h2>
              <p>
                {machine.code} · {machine.location}
              </p>
              <p>
                <StatusBadge
                  label={machine.status === "Available" ? "Available" : "Out of service"}
                  tone={machine.status === "Available" ? "success" : "danger"}
                />
              </p>
              {machine.status === "Available" && !open ? (
                <Button type="button" disabled={busy !== null} onClick={() => void startWithCode(machine.code)}>
                  {busy === "start" ? "Starting…" : "Use this code"}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      <ConfirmDialog
        open={confirmEnd}
        title="End this session?"
        message={
          open
            ? `Ending frees ${open.name} (${open.code}) for the next member. You can start another machine afterwards.`
            : "Ending frees the machine for the next member."
        }
        confirmLabel="End session"
        cancelLabel="Keep session"
        confirmVariant="danger"
        busy={busy === "end"}
        onCancel={() => setConfirmEnd(false)}
        onConfirm={() => void onEndConfirmed()}
      />
    </AppShell>
  );
}
