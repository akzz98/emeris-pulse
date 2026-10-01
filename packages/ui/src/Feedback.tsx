import type { ReactNode } from "react";

export type StatusTone = "neutral" | "success" | "warning" | "danger" | "info";

type StatusBadgeProps = {
  label: string;
  tone?: StatusTone;
};

export function StatusBadge({ label, tone = "neutral" }: StatusBadgeProps) {
  return <span className={`ep-badge ep-badge--${tone}`}>{label}</span>;
}

type StateProps = {
  title: string;
  message: string;
  action?: ReactNode;
};

export function LoadingState({ title, message }: StateProps) {
  return (
    <section className="ep-state" role="status" aria-live="polite">
      <h2>{title}</h2>
      <p>{message}</p>
    </section>
  );
}

export function EmptyState({ title, message, action }: StateProps) {
  return (
    <section className="ep-state">
      {/* The screen already has one h1. This message sits under that title. */}
      <h2>{title}</h2>
      <p>{message}</p>
      {action ? <div className="ep-state-action">{action}</div> : null}
    </section>
  );
}

export function ErrorState({ title, message, action }: StateProps) {
  return (
    <section className="ep-state ep-state-error" role="alert">
      <h2>{title}</h2>
      <p>{message}</p>
      {action ? <div className="ep-state-action">{action}</div> : null}
    </section>
  );
}

export function SuccessBanner({ title, message, action }: StateProps) {
  return (
    <section className="ep-state ep-state-success" role="status" aria-live="polite">
      <h2>{title}</h2>
      <p>{message}</p>
      {action ? <div className="ep-state-action">{action}</div> : null}
    </section>
  );
}
