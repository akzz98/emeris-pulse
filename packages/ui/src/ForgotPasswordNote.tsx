import { useId, useState } from "react";

export function ForgotPasswordNote() {
  const [open, setOpen] = useState(false);
  const noteId = useId();

  return (
    <div className="ep-forgot-password">
      <button
        type="button"
        className="ep-link ep-forgot-password-toggle"
        aria-expanded={open}
        aria-controls={noteId}
        onClick={() => setOpen((value) => !value)}
      >
        Forgot password?
      </button>
      {open ? (
        <p id={noteId} role="status">
          Password resets are not emailed. Ask at the gym desk. A gym administrator sets a new password on the Members
          screen, and you sign in with that password.
        </p>
      ) : null}
    </div>
  );
}
