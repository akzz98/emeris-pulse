import type { AppNavItem } from "@emeris/ui";

export type MemberScreen =
  | "home"
  | "membership"
  | "access"
  | "classes"
  | "equipment"
  | "wellness"
  | "notices"
  | "profile";

const moreScreens: Array<{ id: MemberScreen; label: string }> = [
  { id: "equipment", label: "Equipment" },
  { id: "wellness", label: "Challenges" },
  { id: "notices", label: "Notifications" },
  { id: "membership", label: "Membership" },
  { id: "profile", label: "Profile" },
];

export function memberNav(
  current: MemberScreen,
  onSelect: (screen: MemberScreen) => void,
  options?: { noticeCount?: number },
): AppNavItem[] {
  const moreCurrent = moreScreens.some((screen) => screen.id === current);
  return [
    {
      label: "Home",
      current: current === "home",
      onSelect: () => onSelect("home"),
    },
    {
      label: "Access",
      current: current === "access",
      onSelect: () => onSelect("access"),
    },
    {
      label: "Classes",
      current: current === "classes",
      onSelect: () => onSelect("classes"),
    },
    {
      label: "More",
      current: moreCurrent,
      onSelect: () => undefined,
      children: moreScreens.map((screen) => ({
        label: screen.label,
        current: screen.id === current,
        onSelect: () => onSelect(screen.id),
        badge: screen.id === "notices" ? options?.noticeCount : undefined,
      })),
    },
  ];
}
