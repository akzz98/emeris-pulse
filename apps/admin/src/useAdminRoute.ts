import { useCallback, useEffect } from "react";
import { useHistoryPath } from "@emeris/ui";
import { adminScreenPath, allowedAdminScreen, parseAdminScreen } from "./routing";
import type { AdminScreen } from "./screens";

export function useAdminRoute(role: string | null) {
  const parse = useCallback(
    (pathname: string) => parseAdminScreen(pathname, role ?? "GymAdmin"),
    [role],
  );
  const pathFor = useCallback((screen: AdminScreen) => adminScreenPath(screen), []);
  const [screen, navigate] = useHistoryPath(parse, pathFor);

  useEffect(() => {
    if (!role) {
      return;
    }
    const allowed = allowedAdminScreen(screen, role);
    if (allowed !== screen) {
      navigate(allowed, { replace: true });
    }
  }, [role, screen, navigate]);

  function goScreen(next: AdminScreen) {
    navigate(role ? allowedAdminScreen(next, role) : next);
  }

  return { screen, goScreen, navigate };
}
