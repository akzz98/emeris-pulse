import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import logo from "./assets/emeris-logo.svg";

export type AppNavItem = {
  label: string;
  current: boolean;
  onSelect: () => void;
  /** Optional count shown beside the label (for example unread notices). */
  badge?: number;
  /** Nested items render under a More-style disclosure. */
  children?: AppNavItem[];
};

type AppShellProps = {
  area: string;
  nav?: AppNavItem[];
  onSignOut?: () => void;
  children: ReactNode;
};

function NavBadge({ count }: { count?: number }) {
  if (!count || count <= 0) {
    return null;
  }
  return (
    <span className="ep-nav-badge" aria-label={`${count} new`}>
      {count > 99 ? "99+" : count}
    </span>
  );
}

function NavLink({ item }: { item: AppNavItem }) {
  return (
    <button type="button" aria-current={item.current ? "page" : undefined} onClick={item.onSelect}>
      <span>{item.label}</span>
      <NavBadge count={item.badge} />
    </button>
  );
}

function MoreNav({ item }: { item: AppNavItem }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLLIElement>(null);
  const childCurrent = item.children?.some((child) => child.current) ?? false;
  const badge = item.badge ?? item.children?.reduce((sum, child) => sum + (child.badge ?? 0), 0);

  useEffect(() => {
    if (!open) {
      return;
    }
    function onPointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    // Defer so the opening click does not immediately close the menu.
    const timer = window.setTimeout(() => {
      document.addEventListener("mousedown", onPointerDown);
      document.addEventListener("keydown", onKeyDown);
    }, 0);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <li className="ep-nav-more" ref={rootRef}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls={menuId}
        aria-current={childCurrent ? "true" : undefined}
        className={childCurrent ? "ep-nav-more-trigger is-active" : "ep-nav-more-trigger"}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{item.label}</span>
        <NavBadge count={badge} />
      </button>
      {open ? (
        <ul id={menuId} className="ep-nav-more-menu" role="list">
          {item.children?.map((child) => (
            <li key={child.label}>
              <button
                type="button"
                aria-current={child.current ? "page" : undefined}
                onClick={() => {
                  child.onSelect();
                  setOpen(false);
                }}
              >
                <span>{child.label}</span>
                <NavBadge count={child.badge} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function AppShell({ area, nav, onSignOut, children }: AppShellProps) {
  return (
    <div className="ep-app" data-area={area}>
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
            {nav.map((item) =>
              item.children && item.children.length > 0 ? (
                <MoreNav key={item.label} item={item} />
              ) : (
                <li key={item.label}>
                  <NavLink item={item} />
                </li>
              ),
            )}
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
