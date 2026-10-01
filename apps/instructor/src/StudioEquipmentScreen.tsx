import { FormEvent, useEffect, useState } from "react";
import { AppShell, Button, EmptyState, ErrorState, LoadingState, SuccessBanner, TextField, type AppNavItem } from "@emeris/ui";
import { getStudioEquipment, reportStudioFault, type InstructorSession, type StudioMachine } from "./api";
import "./studio.css";

type StudioEquipmentScreenProps = {
  session: InstructorSession;
  nav: AppNavItem[];
  onSignOut: () => void;
};

export function StudioEquipmentScreen({ session, nav, onSignOut }: StudioEquipmentScreenProps) {
  const [machines, setMachines] = useState<StudioMachine[] | null>(null);
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ title: string; message: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getStudioEquipment(session.accessToken)
      .then((next) => {
        if (active) {
          setMachines(next.equipment);
          setLoadError(null);
        }
      })
      .catch((caught: unknown) => {
        if (!active) {
          return;
        }
        const message = caught instanceof Error ? caught.message : "Could not load studio equipment.";
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

  async function onReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setActionError(null);
    setSuccess(null);
    try {
      const ticket = await reportStudioFault(session.accessToken, code, description);
      setDescription("");
      setSuccess({ title: "Fault reported", message: `A maintenance ticket is open for ${ticket.name}.` });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Could not report this equipment.";
      if (message === "UNAUTHENTICATED") {
        onSignOut();
        return;
      }
      setActionError(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell area="Instructor" nav={nav} onSignOut={onSignOut}>
      <header className="studio-heading">
        <h1>Studio equipment</h1>
        <p>Report studio kit that is unsafe. This opens a maintenance ticket without starting a session.</p>
      </header>
      {loading ? <LoadingState title="Loading studio equipment" message="Checking the studios." /> : null}
      {loadError ? <ErrorState title="Could not load studio equipment" message={loadError} /> : null}
      {actionError ? <ErrorState title="Report not sent" message={actionError} /> : null}
      {success ? <SuccessBanner title={success.title} message={success.message} /> : null}
      <form className="studio-form" onSubmit={(event) => void onReport(event)}>
        <TextField
          id="studio-code"
          label="Machine code"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          autoComplete="off"
          required
        />
        <TextField
          id="studio-fault"
          label="What is unsafe?"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          maxLength={400}
          required
        />
        <Button type="submit" disabled={busy}>
          {busy ? "Sending…" : "Report unsafe equipment"}
        </Button>
      </form>
      {machines && machines.length === 0 ? (
        <EmptyState title="No studio equipment" message="There is no kit listed in a studio." />
      ) : null}
      {machines && machines.length > 0 ? (
        <ul className="studio-list">
          {machines.map((machine) => (
            <li key={machine.id}>
              <h2>{machine.name}</h2>
              <p>
                {machine.code} · {machine.location}
              </p>
              <p>{machine.status === "Available" ? "Available" : "Out of service"}</p>
              <Button type="button" disabled={busy} onClick={() => setCode(machine.code)}>
                Use this code
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </AppShell>
  );
}
