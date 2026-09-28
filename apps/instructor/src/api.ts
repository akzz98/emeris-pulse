const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export type InstructorSession = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
};

export async function login(email: string, password: string): Promise<InstructorSession> {
  const response = await fetch(`${apiUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const body = (await response.json()) as InstructorSession & { error?: { message?: string } };
  if (!response.ok) {
    throw new Error(body.error?.message ?? "Sign in failed.");
  }
  if (body.user.role !== "Instructor") {
    throw new Error("This app is for instructors.");
  }
  return { accessToken: body.accessToken, refreshToken: body.refreshToken, user: body.user };
}

export type RosterClass = {
  id: number;
  title: string;
  startsAt: string;
  endsAt: string;
  location: string;
  members: Array<{ firstName: string; lastName: string; email: string }>;
};

export type Roster = {
  date: string;
  classes: RosterClass[];
};

export async function getRoster(accessToken: string): Promise<Roster> {
  const response = await fetch(`${apiUrl}/classes/roster`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const body = (await response.json()) as Roster & { error?: { message?: string } };
  if (response.status === 401) {
    throw new Error("UNAUTHENTICATED");
  }
  if (!response.ok) {
    throw new Error(body.error?.message ?? "Could not load today's roster.");
  }
  return body;
}

async function readJson<T>(response: Response, fallback: string): Promise<T> {
  const body = (await response.json()) as T & { error?: { message?: string } };
  if (response.status === 401) {
    throw new Error("UNAUTHENTICATED");
  }
  if (!response.ok) {
    throw new Error(body.error?.message ?? fallback);
  }
  return body;
}

export type AttendanceMember = {
  userId: number;
  firstName: string;
  lastName: string;
  status: "Booked" | "Attended" | "Absent" | "Waitlisted" | "Cancelled";
};

export type AttendanceClass = {
  id: number;
  title: string;
  startsAt: string;
  location: string;
  members: AttendanceMember[];
};

export async function getAttendance(accessToken: string): Promise<{ classes: AttendanceClass[] }> {
  const response = await fetch(`${apiUrl}/classes/attendance`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return readJson(response, "Could not load attendance.");
}

export async function recordAttendance(
  accessToken: string,
  classId: number,
  userId: number,
  mark: "Attended" | "Absent",
): Promise<void> {
  const response = await fetch(`${apiUrl}/classes/${classId}/attendance`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ userId, mark }),
  });
  await readJson(response, "Could not record attendance.");
}

export type Trend = {
  id: number;
  title: string;
  startsAt: string;
  attended: number;
  absent: number;
  attendanceRate: number;
};

export async function getTrends(accessToken: string): Promise<{ classes: Trend[] }> {
  const response = await fetch(`${apiUrl}/classes/trends`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return readJson(response, "Could not load attendance trends.");
}

export type InstructorClass = {
  id: number;
  title: string;
  startsAt: string;
  endsAt: string;
  location: string;
  capacity: number;
  placesHeld: number;
};

export async function getMyClasses(accessToken: string): Promise<{ classes: InstructorClass[] }> {
  const response = await fetch(`${apiUrl}/classes/mine`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return readJson(response, "Could not load your classes.");
}

export async function cancelClass(accessToken: string, classId: number): Promise<{ notified: number }> {
  const response = await fetch(`${apiUrl}/classes/${classId}/cancel`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return readJson(response, "Could not cancel this class.");
}
