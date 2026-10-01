import { useEffect, useId, useRef, type ReactNode } from "react";
import { Button, type ButtonVariant } from "./Button";

export type ConfirmDialogProps = {
  open: boolean;
  title: string;
  /** What happens if the person confirms. */
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Destructive confirms use danger. Constructive confirms stay primary. */
  confirmVariant?: ButtonVariant;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
};

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmVariant = "danger",
  busy = false,
  onConfirm,
  onCancel,
  children,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const messageId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (open) {
      if (!dialog.open) {
        dialog.showModal();
      }
      return;
    }
    if (dialog.open) {
      dialog.close();
    }
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <dialog
      ref={dialogRef}
      className="ep-dialog"
      aria-labelledby={titleId}
      aria-describedby={messageId}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) {
          onCancel();
        }
      }}
      onClick={(event) => {
        // A click on the backdrop (the dialog itself) cancels. Clicks inside the panel do not.
        if (event.target === dialogRef.current && !busy) {
          onCancel();
        }
      }}
    >
      <form
        className="ep-dialog-panel"
        method="dialog"
        onSubmit={(event) => {
          event.preventDefault();
          if (!busy) {
            onConfirm();
          }
        }}
      >
        <h2 id={titleId}>{title}</h2>
        <p id={messageId}>{message}</p>
        {children}
        <div className="ep-dialog-actions">
          <Button type="button" variant="secondary" disabled={busy} onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button type="submit" variant={confirmVariant} disabled={busy}>
            {busy ? "Working…" : confirmLabel}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
