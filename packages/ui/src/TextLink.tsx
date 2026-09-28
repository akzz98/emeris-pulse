import type { AnchorHTMLAttributes, ReactNode } from "react";

type TextLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  children: ReactNode;
};

export function TextLink({ children, className, ...props }: TextLinkProps) {
  const classes = className ? `ep-link ${className}` : "ep-link";
  return (
    <a className={classes} {...props}>
      {children}
    </a>
  );
}
