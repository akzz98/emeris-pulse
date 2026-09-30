import { useEffect, useState } from "react";
import { AppShell, Button, ConfirmDialog, EmptyState, ErrorState, LoadingState, type AppNavItem } from "@emeris/ui";
import { closeTicket, getTicketQueue, takeEquipmentOutOfService, type AdminSession, type OpenTicket } from "./api";
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
  const [closingId, setClosingId] = useState<number | null>(null);
  const [pendingOut, setPendingOut] = useState<OpenTicket | null>(null);
  const [pendingClose, setPendingClose] = useState<OpenTicket | null>(null);
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

  async function onCloseConfirmed(ticket: OpenTicket) {
    setClosingId(ticket.id);
    setPendingClose(null);
    setError(null);
    setNotice(null);
    try {
      const closed = await closeTicket(session.accessToken, ticket.id);
      await load();
      setNotice(
        closed.returned
          ? `${closed.name} is back in service.`
          : closed.equipmentStatus === "OutOfService"
            ? `The ticket is closed. ${closed.name} stays out of service while another ticket is open.`
            : `The ticket for ${closed.name} is closed.`,
      );
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Could not close this ticket.";
      if (message === "UNAUTHENTICATED") {
        onSignOut();
        return;
      }
      setError(message);
    } finally {
      setClosingId(null);
    }
  }

  async function onTakeOutConfirmed(ticket: OpenTicket) {
    setBusyId(ticket.equipmentId);
    setPendingOut(null);
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
        <p>Open tickets waiting for the facility team. Closing the last ticket for a machine puts it back in service.</p>
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
              <div className="maintenance-actions">
                {ticket.equipmentStatus === "Available" ? (
                  <Button
                    type="button"
                    variant="danger"
                    disabled={busyId !== null || closingId !== null}
                    onClick={() => setPendingOut(ticket)}
                  >
                    {busyId === ticket.equipmentId ? "Updating…" : "Take out of service"}
                  </Button>
                ) : null}
                <Button type="button" disabled={busyId !== null || closingId !== null} onClick={() => setPendingClose(ticket)}>
                  {closingId === ticket.id
                    ? "Closing…"
                    : ticket.equipmentStatus === "OutOfService"
                      ? "Close and return"
                      : "Close ticket"}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      <ConfirmDialog
        open={pendingOut !== null}
        title="Take this machine out of service?"
        message={
          pendingOut
            ? `${pendingOut.name} (${pendingOut.code}) will not accept new sessions until it is returned to service.`
            : ""
        }
        confirmLabel="Take out of service"
        cancelLabel="Keep available"
        confirmVariant="danger"
        busy={pendingOut !== null && busyId === pendingOut.equipmentId}
        onCancel={() => setPendingOut(null)}
        onConfirm={() => {
          if (pendingOut) {
            void onTakeOutConfirmed(pendingOut);
          }
        }}
      />
      <ConfirmDialog
        open={pendingClose !== null}
        title={
          pendingClose?.equipmentStatus === "OutOfService"
            ? "Close this ticket and return the machine?"
            : "Close this maintenance ticket?"
        }
        message={
          pendingClose
            ? pendingClose.equipmentStatus === "OutOfService"
              ? `${pendingClose.name} (${pendingClose.code}) will accept new sessions again if this is the last open ticket.`
              : `The report for ${pendingClose.name} (${pendingClose.code}) will be marked closed.`
            : ""
        }
        confirmLabel={pendingClose?.equipmentStatus === "OutOfService" ? "Close and return" : "Close ticket"}
        cancelLabel="Keep open"
        confirmVariant="primary"
        busy={pendingClose !== null && closingId === pendingClose.id}
        onCancel={() => setPendingClose(null)}
        onConfirm={() => {
          if (pendingClose) {
            void onCloseConfirmed(pendingClose);
          }
        }}
      />
    </AppShell>
  );
}
