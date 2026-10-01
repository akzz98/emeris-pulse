export type InstructorRoute =
  | { screen: "today" }
  | { screen: "studio" }
  | { screen: "detail"; classId: number };

export function parseInstructorRoute(pathname: string): InstructorRoute {
  const clean = pathname.replace(/\/+$/, "") || "/";
  if (clean === "/studio") {
    return { screen: "studio" };
  }
  const classMatch = clean.match(/^\/classes\/(\d+)$/);
  if (classMatch) {
    return { screen: "detail", classId: Number(classMatch[1]) };
  }
  return { screen: "today" };
}

export function instructorRoutePath(route: InstructorRoute): string {
  if (route.screen === "studio") {
    return "/studio";
  }
  if (route.screen === "detail") {
    return `/classes/${route.classId}`;
  }
  return "/";
}
