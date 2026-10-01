import type { ReactNode, SelectHTMLAttributes } from "react";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
};

export function Select({ id, label, hint, error, children, "aria-describedby": describedBy, ...props }: SelectProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedByIds = [describedBy, hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="ep-field">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        {...props}
        aria-invalid={error ? true : props["aria-invalid"]}
        aria-describedby={describedByIds}
      >
        {children}
      </select>
      {hint ? (
        <p id={hintId} className="ep-field-hint">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="ep-field-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
