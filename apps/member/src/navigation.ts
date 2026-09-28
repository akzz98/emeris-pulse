import type { AppNavItem } from "@emeris/ui";

export type MemberScreen = "home" | "membership" | "access" | "timetable" | "book" | "equipment" | "wellness" | "notices" | "profile";

// Labels match the Part 1 member screens that are built.
const memberScreens: Array<{ id: MemberScreen; label: string }> = [
  { id: "home", label: "Home" },
  { id: "membership", label: "Membership" },
  { id: "access", label: "QR / cardless access" },
  { id: "timetable", label: "Class timetable" },
  { id: "book", label: "Book a class" },
  { id: "equipment", label: "Equipment" },
  { id: "wellness", label: "Wellness" },
  { id: "notices", label: "Notifications" },
  { id: "profile", label: "Profile" },
];

export function memberNav(current: MemberScreen, onSelect: (screen: MemberScreen) => void): AppNavItem[] {
  return memberScreens.map((screen) => ({
    label: screen.label,
    current: screen.id === current,
    onSelect: () => onSelect(screen.id),
  }));
}
