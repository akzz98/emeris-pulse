import { useEffect, useState } from "react";
import { AppShell, Button, EmptyState, ErrorState, LoadingState, type AppNavItem } from "@emeris/ui";
import {
  getClassFill,
  getEquipmentDowntime,
  getWellnessParticipation,
  type AdminSession,
  type ClassFillReport,
  type DowntimeReport,
  type WellnessReport,
} from "./api";
import "./reports.css";

type ReportsScreenProps = {
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
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDay(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function ReportPager({
  page,
  pageSize,
  total,
  onPage,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
}) {
  if (total <= 0) {
    return null;
  }
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="report-pager">
      <Button variant="secondary" onClick={() => onPage(page - 1)} disabled={page <= 1}>
        Previous
      </Button>
      <p>
        Page {page} of {pageCount}
      </p>
      <Button variant="secondary" onClick={() => onPage(page + 1)} disabled={page >= pageCount}>
        Next
      </Button>
    </div>
  );
}

function downLabel(hours: number | null): string {
  if (hours === null) {
    return "Out of service";
  }
  if (hours < 1) {
    return "Down for less than an hour";
  }
  return hours === 1 ? "Down for 1 hour" : `Down for ${hours} hours`;
}

export function ReportsScreen({ session, nav, onSignOut }: ReportsScreenProps) {
  const [fill, setFill] = useState<ClassFillReport | null>(null);
  const [downtime, setDowntime] = useState<DowntimeReport | null>(null);
  const [wellness, setWellness] = useState<WellnessReport | null>(null);
  const [fillError, setFillError] = useState<string | null>(null);
  const [downtimeError, setDowntimeError] = useState<string | null>(null);
  const [wellnessError, setWellnessError] = useState<string | null>(null);
  const [fillLoading, setFillLoading] = useState(true);
  const [downtimeLoading, setDowntimeLoading] = useState(true);
  const [wellnessLoading, setWellnessLoading] = useState(true);
  const [fillPage, setFillPage] = useState(1);
  const [downtimePage, setDowntimePage] = useState(1);
  const [wellnessPage, setWellnessPage] = useState(1);

  useEffect(() => {
    let active = true;
    setFillLoading(true);
    getClassFill(session.accessToken, fillPage)
      .then((next) => {
        if (!active) {
          return;
        }
        setFill(next);
        setFillError(null);
      })
      .catch((caught: unknown) => {
        if (!active) {
          return;
        }
        const message = caught instanceof Error ? caught.message : "Could not load the class fill report.";
        if (message === "UNAUTHENTICATED") {
          onSignOut();
          return;
        }
        setFillError(message);
      })
      .finally(() => {
        if (active) {
          setFillLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [session.accessToken, fillPage, onSignOut]);

  useEffect(() => {
    let active = true;
    setDowntimeLoading(true);
    getEquipmentDowntime(session.accessToken, downtimePage)
      .then((next) => {
        if (!active) {
          return;
        }
        setDowntime(next);
        setDowntimeError(null);
      })
      .catch((caught: unknown) => {
        if (!active) {
          return;
        }
        const message = caught instanceof Error ? caught.message : "Could not load the downtime report.";
        if (message === "UNAUTHENTICATED") {
          onSignOut();
          return;
        }
        setDowntimeError(message);
      })
      .finally(() => {
        if (active) {
          setDowntimeLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [session.accessToken, downtimePage, onSignOut]);

  useEffect(() => {
    let active = true;
    setWellnessLoading(true);
    getWellnessParticipation(session.accessToken, wellnessPage)
      .then((next) => {
        if (!active) {
          return;
        }
        setWellness(next);
        setWellnessError(null);
      })
      .catch((caught: unknown) => {
        if (!active) {
          return;
        }
        const message = caught instanceof Error ? caught.message : "Could not load the wellness report.";
        if (message === "UNAUTHENTICATED") {
          onSignOut();
          return;
        }
        setWellnessError(message);
      })
      .finally(() => {
        if (active) {
          setWellnessLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [session.accessToken, wellnessPage, onSignOut]);

  const area = session.user.role === "FacilityManager" ? "Facility" : "Admin";
  const down = downtime?.machines ?? [];

  return (
    <AppShell area={area} nav={nav} onSignOut={onSignOut}>
      <header className="reports-heading">
        <h1>Reports</h1>
        <p>How full the classes are, which machines are out of service, and who joined a challenge.</p>
      </header>
      <section className="report" aria-labelledby="fill-heading">
        <h2 id="fill-heading">Class fill rate</h2>
        <p>A held seat counts. A waitlisted member does not.</p>
        {fillLoading ? <LoadingState title="Loading class fill" message="Checking held seats." /> : null}
        {!fillLoading && fillError ? <ErrorState title="Could not load fill rates" message={fillError} /> : null}
        {!fillLoading && fill && fill.total === 0 ? (
          <EmptyState title="No classes" message="Scheduled classes appear here once they are published." />
        ) : null}
        {!fillLoading && fill && fill.total > 0 ? (
          <>
            <p className="report-summary">
              {fill.filled} of {fill.seats} seats held · {fill.fillRate}% full
            </p>
            {fill.classes.length > 0 ? (
              <ul>
                {fill.classes.map((item) => (
                  <li key={item.id}>
                    <h3>{item.title}</h3>
                    <p>{formatWhen(item.startsAt)}</p>
                    <p>
                      {item.location} · {item.filled} of {item.capacity} · {item.fillRate}%
                    </p>
                  </li>
                ))}
              </ul>
            ) : null}
            <ReportPager page={fill.page} pageSize={fill.pageSize} total={fill.total} onPage={setFillPage} />
          </>
        ) : null}
      </section>
      <section className="report" aria-labelledby="downtime-heading">
        <h2 id="downtime-heading">Equipment downtime</h2>
        <p>Time out of service is counted from the earliest ticket that is still open.</p>
        {downtimeLoading ? <LoadingState title="Loading downtime" message="Checking machines that are out of service." /> : null}
        {!downtimeLoading && downtimeError ? <ErrorState title="Could not load downtime" message={downtimeError} /> : null}
        {!downtimeLoading && downtime && downtime.total === 0 ? (
          <EmptyState title="No equipment" message="Machines appear here once they are registered." />
        ) : null}
        {!downtimeLoading && downtime && downtime.total > 0 && downtime.outOfService === 0 ? (
          <EmptyState title="No downtime" message="Every machine is available." />
        ) : null}
        {!downtimeLoading && downtime && downtime.outOfService > 0 ? (
          <>
            <p className="report-summary">
              {downtime.outOfService} of {downtime.total} machines out of service
            </p>
            {down.length > 0 ? (
              <ul>
                {down.map((item) => (
                  <li key={item.id}>
                    <h3>
                      {item.code} · {item.name}
                    </h3>
                    <p>{item.location}</p>
                    <p>
                      {downLabel(item.hoursDown)} · {item.openTickets === 1 ? "1 open ticket" : `${item.openTickets} open tickets`}
                    </p>
                  </li>
                ))}
              </ul>
            ) : null}
            <ReportPager
              page={downtime.page}
              pageSize={downtime.pageSize}
              total={downtime.outOfService}
              onPage={setDowntimePage}
            />
          </>
        ) : null}
      </section>
      <section className="report" aria-labelledby="wellness-heading">
        <h2 id="wellness-heading">Wellness participation</h2>
        <p>Each person is counted on every challenge they joined.</p>
        {wellnessLoading ? <LoadingState title="Loading wellness" message="Checking who joined a challenge." /> : null}
        {!wellnessLoading && wellnessError ? <ErrorState title="Could not load wellness report" message={wellnessError} /> : null}
        {!wellnessLoading && wellness && wellness.total === 0 ? (
          <EmptyState title="No challenges" message="Campus challenges appear here once they are published." />
        ) : null}
        {!wellnessLoading && wellness && wellness.total > 0 ? (
          <>
            <p className="report-summary">
              {wellness.people === 1 ? "1 person joined" : `${wellness.people} people joined`} ·{" "}
              {wellness.enrolments === 1 ? "1 enrolment" : `${wellness.enrolments} enrolments`}
            </p>
            {wellness.challenges.length > 0 ? (
              <ul>
                {wellness.challenges.map((item) => (
                  <li key={item.id}>
                    <h3>{item.title}</h3>
                    <p>
                      {formatDay(item.startsOn)} – {formatDay(item.endsOn)} · {item.phase}
                    </p>
                    <p>{item.participants === 1 ? "1 person joined" : `${item.participants} people joined`}</p>
                  </li>
                ))}
              </ul>
            ) : null}
            <ReportPager page={wellness.page} pageSize={wellness.pageSize} total={wellness.total} onPage={setWellnessPage} />
          </>
        ) : null}
      </section>
    </AppShell>
  );
}
