import type { TextareaHTMLAttributes } from "react";

type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  id: string;
  label: string;
  hint?: string;
  error?: string;
};

export function TextArea({ id, label, hint, error, "aria-describedby": describedBy, ...props }: TextAreaProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedByIds = [describedBy, hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="ep-field">
      <label htmlFor={id}>{label}</label>
      <textarea
        id={id}
        {...props}
        aria-invalid={error ? true : props["aria-invalid"]}
        aria-describedby={describedByIds}
      />
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
