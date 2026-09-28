import { FormEvent, useEffect, useState } from "react";
import { AppShell, Button, EmptyState, ErrorState, LoadingState, TextField, type AppNavItem } from "@emeris/ui";
import {
  endEquipmentSession,
  getCurrentEquipmentSession,
  getEquipment,
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
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

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
    setError(null);
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
    // Load once for this sign-in. Start and end refresh the floor themselves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.accessToken, onSignOut]);

  async function onStart(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const started = await startEquipmentSession(session.accessToken, code);
      await load();
      setCode("");
      setNotice(`${started.name} session started.`);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Could not start this machine.";
      if (message === "UNAUTHENTICATED") {
        onSignOut();
        return;
      }
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  async function onEnd() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await endEquipmentSession(session.accessToken);
      await load();
      setNotice("Your equipment session has ended.");
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Could not end this session.";
      if (message === "UNAUTHENTICATED") {
        onSignOut();
        return;
      }
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell area="Member" nav={nav} onSignOut={onSignOut}>
      <header className="equipment-heading">
        <h1>Equipment</h1>
        <p>Enter the code on the machine to start a session. A machine that is out of service cannot be started.</p>
      </header>
      {loading ? <LoadingState title="Loading equipment" message="Checking the floor and your session." /> : null}
      {error ? <ErrorState title="Equipment not updated" message={error} /> : null}
      {notice ? (
        <p className="equipment-notice" role="status">
          {notice}
        </p>
      ) : null}
      {open ? (
        <section className="equipment-open">
          <h2>
            {open.name} ({open.code})
          </h2>
          <p>
            Started at {formatWhen(open.startedAt)} · {open.location}
          </p>
          <Button type="button" disabled={busy} onClick={() => void onEnd()}>
            {busy ? "Ending…" : "End session"}
          </Button>
        </section>
      ) : (
        <form className="equipment-form" onSubmit={(event) => void onStart(event)}>
          <TextField
            id="machine-code"
            label="Machine code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            autoComplete="off"
            required
          />
          <Button type="submit" disabled={busy}>
            {busy ? "Starting…" : "Start session"}
          </Button>
        </form>
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
              <p>{machine.status === "Available" ? "Available" : "Out of service"}</p>
              {machine.status === "Available" && !open ? (
                <Button type="button" disabled={busy} onClick={() => setCode(machine.code)}>
                  Use this code
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </AppShell>
  );
}
