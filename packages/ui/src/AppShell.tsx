import type { ReactNode } from "react";
import logo from "./assets/emeris-logo.svg";

export type AppNavItem = {
  label: string;
  current: boolean;
  onSelect: () => void;
  /** Optional count shown beside the label (for example unread notices). */
  badge?: number;
};

type AppShellProps = {
  area: string;
  nav?: AppNavItem[];
  onSignOut?: () => void;
  children: ReactNode;
};

export function AppShell({ area, nav, onSignOut, children }: AppShellProps) {
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
      {nav ? (
        <nav className="ep-nav" aria-label={`${area} screens`}>
          <ul>
            {nav.map((item) => (
              <li key={item.label}>
                <button type="button" aria-current={item.current ? "page" : undefined} onClick={item.onSelect}>
                  <span>{item.label}</span>
                  {item.badge && item.badge > 0 ? (
                    <span className="ep-nav-badge" aria-label={`${item.badge} new`}>
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
            {onSignOut ? (
              <li className="ep-nav-end">
                <button type="button" onClick={onSignOut}>
                  Sign out
                </button>
              </li>
            ) : null}
          </ul>
        </nav>
      ) : null}
      <main id="main" className="ep-main">
        {children}
      </main>
    </div>
  );
}
