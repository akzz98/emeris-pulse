import type { AppNavItem } from "@emeris/ui";

export type MemberScreen = "home" | "membership" | "access" | "timetable" | "book" | "equipment" | "profile";

// Labels match the Part 1 member screens that are built.
// Wellness and Notifications join this list with those names.
const memberScreens: Array<{ id: MemberScreen; label: string }> = [
  { id: "home", label: "Home" },
  { id: "membership", label: "Membership" },
  { id: "access", label: "QR / cardless access" },
  { id: "timetable", label: "Class timetable" },
  { id: "book", label: "Book a class" },
  { id: "equipment", label: "Equipment" },
  { id: "profile", label: "Profile" },
];

export function memberNav(current: MemberScreen, onSelect: (screen: MemberScreen) => void): AppNavItem[] {
  return memberScreens.map((screen) => ({
    label: screen.label,
    current: screen.id === current,
    onSelect: () => onSelect(screen.id),
  }));
}
