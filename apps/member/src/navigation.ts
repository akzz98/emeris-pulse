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

// Labels match the Part 1 member screens that are built. Classes replaces timetable + book.
const memberScreens: Array<{ id: MemberScreen; label: string }> = [
  { id: "home", label: "Home" },
  { id: "membership", label: "Membership" },
  { id: "access", label: "QR / cardless access" },
  { id: "classes", label: "Classes" },
  { id: "equipment", label: "Equipment" },
  { id: "wellness", label: "Wellness" },
  { id: "notices", label: "Notifications" },
  { id: "profile", label: "Profile" },
];

export function memberNav(
  current: MemberScreen,
  onSelect: (screen: MemberScreen) => void,
  options?: { noticeCount?: number },
): AppNavItem[] {
  return memberScreens.map((screen) => ({
    label: screen.label,
    current: screen.id === current,
    onSelect: () => onSelect(screen.id),
    badge: screen.id === "notices" ? options?.noticeCount : undefined,
  }));
}
