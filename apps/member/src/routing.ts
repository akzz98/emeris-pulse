import { useCallback, useEffect } from "react";
import { useHistoryPath } from "@emeris/ui";
import type { MemberScreen } from "./navigation";

const MEMBER_SCREENS: MemberScreen[] = [
  "home",
  "membership",
  "access",
  "classes",
  "equipment",
  "challenges",
  "notices",
  "profile",
];

export type MemberRoute =
  | { area: "auth"; mode: "login" | "register" }
  | { area: "app"; screen: MemberScreen };

export function parseMemberRoute(pathname: string): MemberRoute {
  const clean = pathname.replace(/\/+$/, "") || "/";
  if (clean === "/register") {
    return { area: "auth", mode: "register" };
  }
  if (clean === "/login") {
    return { area: "auth", mode: "login" };
  }
  if (clean === "/" || clean === "") {
    return { area: "app", screen: "home" };
  }
  const id = clean.slice(1).split("/")[0] ?? "";
  if (MEMBER_SCREENS.includes(id as MemberScreen)) {
    return { area: "app", screen: id as MemberScreen };
  }
  return { area: "app", screen: "home" };
}

export function memberRoutePath(route: MemberRoute): string {
  if (route.area === "auth") {
    return route.mode === "register" ? "/register" : "/login";
  }
  return route.screen === "home" ? "/" : `/${route.screen}`;
}

export function useMemberRoute(signedIn: boolean) {
  const parse = useCallback((pathname: string) => parseMemberRoute(pathname), []);
  const pathFor = useCallback((route: MemberRoute) => memberRoutePath(route), []);
  const [route, navigate] = useHistoryPath(parse, pathFor);

  // Signed-in members should not stay on /login or /register.
  useEffect(() => {
    if (signedIn && route.area === "auth") {
      navigate({ area: "app", screen: "home" }, { replace: true });
    }
  }, [signedIn, route, navigate]);

  function goScreen(screen: MemberScreen) {
    navigate({ area: "app", screen });
  }

  function goAuth(mode: "login" | "register") {
    navigate({ area: "auth", mode });
  }

  return { route, navigate, goScreen, goAuth };
}
