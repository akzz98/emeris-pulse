import { useState, type InputHTMLAttributes } from "react";
import { TextField } from "./TextField";

type PasswordFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "id"> & {
  id: string;
  label: string;
  hint?: string;
  error?: string;
};

export function PasswordField({ id, label, hint, error, ...props }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const toggleId = `${id}-show`;

  return (
    <div className="ep-password-field">
      <TextField id={id} label={label} type={visible ? "text" : "password"} hint={hint} error={error} {...props} />
      <label className="ep-show-password" htmlFor={toggleId}>
        <input
          id={toggleId}
          type="checkbox"
          checked={visible}
          onChange={(event) => setVisible(event.target.checked)}
        />
        Show password
      </label>
    </div>
  );
}
