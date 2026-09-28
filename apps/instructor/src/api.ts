import { clearSession, loadSession, saveSession } from "./session";

const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

let refreshInFlight: Promise<string | null> | null = null;

function bearerFrom(init?: RequestInit): string | null {
  if (!init?.headers) {
    return null;
  }
  const value = new Headers(init.headers).get("Authorization");
  if (!value?.startsWith("Bearer ")) {
    return null;
  }
  return value.slice("Bearer ".length);
}

async function refreshAccessToken(): Promise<string | null> {
  const current = loadSession();
  if (!current?.refreshToken) {
    clearSession();
    return null;
  }
  if (!refreshInFlight) {
    const refreshToken = current.refreshToken;
    refreshInFlight = (async () => {
      const response = await fetch(`${apiUrl}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (!response.ok) {
        clearSession();
        return null;
      }
      const body = (await response.json()) as {
        accessToken: string;
        refreshToken: string;
        user: NonNullable<ReturnType<typeof loadSession>>["user"];
      };
      saveSession({
        accessToken: body.accessToken,
        refreshToken: body.refreshToken,
        user: body.user,
      });
      return body.accessToken;
    })().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

async function authorized(url: string, init: RequestInit = {}): Promise<Response> {
  const stored = loadSession();
  const token = stored?.accessToken ?? bearerFrom(init);
  const send = (accessToken: string) => {
    const headers = new Headers(init.headers);
    headers.set("Authorization", "Bearer " + accessToken);
    return fetch(url, { ...init, headers });
  };
  if (!token) {
    return fetch(url, init);
  }
  const response = await send(token);
  if (response.status !== 401) {
    return response;
  }
  const next = await refreshAccessToken();
  if (!next) {
    return response;
  }
  return send(next);
}


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
  const response = await authorized(`${apiUrl}/classes/roster`, {
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
  const response = await authorized(`${apiUrl}/classes/attendance`, {
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
  const response = await authorized(`${apiUrl}/classes/${classId}/attendance`, {
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
  const response = await authorized(`${apiUrl}/classes/trends`, {
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
  const response = await authorized(`${apiUrl}/classes/mine`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return readJson(response, "Could not load your classes.");
}

export type StudioMachine = {
  id: number;
  code: string;
  name: string;
  location: string;
  status: "Available" | "OutOfService";
};

export async function getStudioEquipment(accessToken: string): Promise<{ equipment: StudioMachine[] }> {
  const response = await authorized(`${apiUrl}/equipment/studio`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return readJson(response, "Could not load studio equipment.");
}

export async function reportStudioFault(
  accessToken: string,
  code: string,
  description: string,
): Promise<{ name: string }> {
  const response = await authorized(`${apiUrl}/equipment/studio/tickets`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ code, description }),
  });
  return readJson(response, "Could not report this equipment.");
}

export async function messageBookedMembers(
  accessToken: string,
  classId: number,
  message: string,
): Promise<{ notified: number }> {
  const response = await authorized(`${apiUrl}/classes/${classId}/message`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  return readJson(response, "Could not send this message.");
}

export async function cancelClass(accessToken: string, classId: number): Promise<{ notified: number }> {
  const response = await authorized(`${apiUrl}/classes/${classId}/cancel`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return readJson(response, "Could not cancel this class.");
}
