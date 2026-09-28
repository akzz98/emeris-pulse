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
