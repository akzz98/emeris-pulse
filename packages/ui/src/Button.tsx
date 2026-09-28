import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
};

export function Button({ children, type = "button", className, ...props }: ButtonProps) {
  const classes = className ? `ep-button ${className}` : "ep-button";
  return (
    <button type={type} className={classes} {...props}>
      {children}
    </button>
  );
}
