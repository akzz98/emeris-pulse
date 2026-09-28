import type { ReactNode } from "react";
import logo from "./assets/emeris-logo.svg";

type AppShellProps = {
  area: string;
  children: ReactNode;
};

export function AppShell({ area, children }: AppShellProps) {
  return (
    <div className="ep-app">
      <a className="ep-skip" href="#main">
        Skip to content
      </a>
      <header className="ep-header">
        <img src={logo} alt="Emeris" className="ep-logo" />
        <div>
          <p className="ep-product">Emeris Pulse</p>
          <p className="ep-area">{area}</p>
        </div>
      </header>
      <main id="main" className="ep-main">
        {children}
      </main>
    </div>
  );
}
