import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  /** Visual style. Default stays the teal primary used on forms. */
  variant?: ButtonVariant;
};

export function Button({
  children,
  type = "button",
  variant = "primary",
  className,
  ...props
}: ButtonProps) {
  const classes = ["ep-button", `ep-button--${variant}`, className].filter(Boolean).join(" ");
  return (
    <button type={type} className={classes} {...props}>
      {children}
    </button>
  );
}
