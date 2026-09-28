type StateProps = {
  title: string;
  message: string;
};

export function LoadingState({ title, message }: StateProps) {
  return (
    <section className="ep-state" role="status" aria-live="polite">
      <h2>{title}</h2>
      <p>{message}</p>
    </section>
  );
}

export function EmptyState({ title, message }: StateProps) {
  return (
    <section className="ep-state">
      <h1>{title}</h1>
      <p>{message}</p>
    </section>
  );
}

export function ErrorState({ title, message }: StateProps) {
  return (
    <section className="ep-state ep-state-error" role="alert">
      <h2>{title}</h2>
      <p>{message}</p>
    </section>
  );
}

export function SuccessBanner({ title, message }: StateProps) {
  return (
    <section className="ep-state ep-state-success" role="status" aria-live="polite">
      <h2>{title}</h2>
      <p>{message}</p>
    </section>
  );
}
