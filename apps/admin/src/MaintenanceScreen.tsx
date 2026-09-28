import { useEffect, useState } from "react";
import { AppShell, Button, EmptyState, ErrorState, LoadingState, type AppNavItem } from "@emeris/ui";
import { getTicketQueue, takeEquipmentOutOfService, type AdminSession, type OpenTicket } from "./api";
import "./maintenance.css";

type MaintenanceScreenProps = {
  session: AdminSession;
  nav: AppNavItem[];
  onSignOut: () => void;
};

function formatWhen(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MaintenanceScreen({ session, nav, onSignOut }: MaintenanceScreenProps) {
  const [tickets, setTickets] = useState<OpenTicket[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const area = session.user.role === "FacilityManager" ? "Facility" : "Admin";

  async function load() {
    const next = await getTicketQueue(session.accessToken);
    setTickets(next.tickets);
  }

  useEffect(() => {
    let active = true;
    setLoading(true);
    load()
      .then(() => {
        if (active) {
          setError(null);
        }
      })
      .catch((caught: unknown) => {
        if (!active) {
          return;
        }
        const message = caught instanceof Error ? caught.message : "Could not load the ticket queue.";
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.accessToken, onSignOut]);

  async function onTakeOut(ticket: OpenTicket) {
    setBusyId(ticket.equipmentId);
    setError(null);
    setNotice(null);
    try {
      const updated = await takeEquipmentOutOfService(session.accessToken, ticket.equipmentId);
      await load();
      setNotice(`${updated.name} is out of service.`);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Could not take this machine out of service.";
      if (message === "UNAUTHENTICATED") {
        onSignOut();
        return;
      }
      setError(message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AppShell area={area} nav={nav} onSignOut={onSignOut}>
      <header className="maintenance-heading">
        <h1>Maintenance</h1>
        <p>Open tickets waiting for the facility team. Taking a machine out of service stops new sessions on it.</p>
      </header>
      {loading ? <LoadingState title="Loading tickets" message="Checking the open queue." /> : null}
      {error ? <ErrorState title="Queue not updated" message={error} /> : null}
      {notice ? (
        <p className="maintenance-notice" role="status">
          {notice}
        </p>
      ) : null}
      {tickets && tickets.length === 0 ? (
        <EmptyState title="No open tickets" message="Every reported fault has been closed." />
      ) : null}
      {tickets && tickets.length > 0 ? (
        <ul className="maintenance-list">
          {tickets.map((ticket) => (
            <li key={ticket.id}>
              <h2>
                {ticket.name} ({ticket.code})
              </h2>
              <p>{ticket.location}</p>
              <p>{ticket.description}</p>
              <p>
                Reported by {ticket.reportedBy} · {formatWhen(ticket.openedAt)}
              </p>
              <p>{ticket.equipmentStatus === "Available" ? "Available" : "Out of service"}</p>
              {ticket.equipmentStatus === "Available" ? (
                <Button type="button" disabled={busyId === ticket.equipmentId} onClick={() => void onTakeOut(ticket)}>
                  {busyId === ticket.equipmentId ? "Updating…" : "Take out of service"}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </AppShell>
  );
}
