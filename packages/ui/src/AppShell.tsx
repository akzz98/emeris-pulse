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

function TabIcon({ label }: { label: string }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (label) {
    case "Home":
      return (
        <svg {...common}>
          <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" />
        </svg>
      );
    case "Access":
      return (
        <svg {...common}>
          <rect x="4" y="4" width="7" height="7" rx="1" />
          <rect x="13" y="4" width="7" height="7" rx="1" />
          <rect x="4" y="13" width="7" height="7" rx="1" />
          <path d="M13 13h3v3h-3zm4 0h3v3h-3zm-4 4h3v3h-3zm4 0h3v3h-3z" />
        </svg>
      );
    case "Classes":
      return (
        <svg {...common}>
          <rect x="4" y="5" width="16" height="15" rx="2" />
          <path d="M8 3v4M16 3v4M4 10h16" />
        </svg>
      );
    case "More":
      return (
        <svg {...common}>
          <circle cx="6" cy="12" r="1.4" fill="currentColor" stroke="none" />
          <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
          <circle cx="18" cy="12" r="1.4" fill="currentColor" stroke="none" />
        </svg>
      );
    default:
      return null;
  }
}

function NavLink({ item, withIcon }: { item: AppNavItem; withIcon?: boolean }) {
  return (
    <button type="button" aria-current={item.current ? "page" : undefined} onClick={item.onSelect}>
      {withIcon ? <TabIcon label={item.label} /> : null}
      <span>{item.label}</span>
      <NavBadge count={item.badge} />
    </button>
  );
}

type MoreNavProps = {
  item: AppNavItem;
  sheet: boolean;
  onSignOut?: () => void;
};

function MoreNav({ item, sheet, onSignOut }: MoreNavProps) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const titleId = useId();
  const rootRef = useRef<HTMLLIElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const childCurrent = item.children?.some((child) => child.current) ?? false;
  const badge = item.badge ?? item.children?.reduce((sum, child) => sum + (child.badge ?? 0), 0);

  useEffect(() => {
    if (!open) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    if (!sheet) {
      function onPointerDown(event: MouseEvent) {
        if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
          setOpen(false);
        }
      }
      const timer = window.setTimeout(() => {
        document.addEventListener("mousedown", onPointerDown);
        document.addEventListener("keydown", onKeyDown);
      }, 0);
      return () => {
        window.clearTimeout(timer);
        document.removeEventListener("mousedown", onPointerDown);
        document.removeEventListener("keydown", onKeyDown);
      };
    }

    const previous = document.activeElement as HTMLElement | null;
    const firstItem = sheetRef.current?.querySelector<HTMLElement>(".ep-more-sheet-list button");
    firstItem?.focus();
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      (previous ?? triggerRef.current)?.focus?.();
    };
  }, [open, sheet]);

  function close() {
    setOpen(false);
  }

  function selectChild(child: AppNavItem) {
    child.onSelect();
    close();
  }

  const menuItems = (
    <ul id={menuId} className={sheet ? "ep-more-sheet-list" : "ep-nav-more-menu"} role="list">
      {item.children?.map((child) => (
        <li key={child.label}>
          <button
            type="button"
            aria-current={child.current ? "page" : undefined}
            onClick={() => selectChild(child)}
          >
            <span>{child.label}</span>
            <NavBadge count={child.badge} />
          </button>
        </li>
      ))}
      {sheet && onSignOut ? (
        <li>
          <button
            type="button"
            className="ep-more-sheet-signout"
            onClick={() => {
              close();
              onSignOut();
            }}
          >
            Sign out
          </button>
        </li>
      ) : null}
    </ul>
  );

  return (
    <li className="ep-nav-more" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-haspopup={sheet ? "dialog" : "true"}
        aria-controls={menuId}
        aria-current={childCurrent ? "true" : undefined}
        className={childCurrent || open ? "ep-nav-more-trigger is-active" : "ep-nav-more-trigger"}
        onClick={() => setOpen((current) => !current)}
      >
        {sheet ? <TabIcon label="More" /> : null}
        <span>{item.label}</span>
        <NavBadge count={badge} />
      </button>
      {open && !sheet ? menuItems : null}
      {open && sheet ? (
        <div className="ep-more-sheet" role="presentation">
          <button type="button" className="ep-more-sheet-backdrop" aria-label="Close More" onClick={close} />
          <div
            ref={sheetRef}
            className="ep-more-sheet-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
          >
            <div className="ep-more-sheet-header">
              <h2 id={titleId}>More</h2>
              <button type="button" className="ep-more-sheet-close" onClick={close}>
                Close
              </button>
            </div>
            {menuItems}
          </div>
        </div>
      ) : null}
    </li>
  );
}

function useNarrowMemberNav(enabled: boolean): boolean {
  const [narrow, setNarrow] = useState(() =>
    enabled && typeof window !== "undefined" ? window.matchMedia("(max-width: 40rem)").matches : false,
  );

  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      setNarrow(false);
      return;
    }
    const media = window.matchMedia("(max-width: 40rem)");
    function onChange() {
      setNarrow(media.matches);
    }
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [enabled]);

  return enabled && narrow;
}

export function AppShell({ area, nav, onSignOut, children }: AppShellProps) {
  const memberArea = area === "Member";
  const bottomTabs = useNarrowMemberNav(memberArea);

  return (
    <div
      className={memberArea ? "ep-app ep-app--member" : "ep-app"}
      data-area={area}
      data-member-nav={bottomTabs ? "bottom" : memberArea ? "top" : undefined}
    >
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
        <nav
          className={bottomTabs ? "ep-nav ep-nav--member ep-nav--bottom" : "ep-nav"}
          aria-label={`${area} screens`}
        >
          <ul>
            {nav.map((item) =>
              item.children && item.children.length > 0 ? (
                <MoreNav
                  key={item.label}
                  item={item}
                  sheet={bottomTabs}
                  onSignOut={bottomTabs ? onSignOut : undefined}
                />
              ) : (
                <li key={item.label}>
                  <NavLink item={item} withIcon={bottomTabs} />
                </li>
              ),
            )}
            {onSignOut && !bottomTabs ? (
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
