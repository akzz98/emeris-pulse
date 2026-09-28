import type { MemberSession } from "./session";

const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  user: MemberSession["user"];
};

async function readSession(response: Response, fallback: string): Promise<MemberSession> {
  const body = (await response.json()) as LoginResponse & {
    error?: { message?: string };
  };
  if (!response.ok) {
    throw new Error(body.error?.message ?? fallback);
  }
  return {
    accessToken: body.accessToken,
    refreshToken: body.refreshToken,
    user: body.user,
  };
}

export async function login(email: string, password: string): Promise<MemberSession> {
  const response = await fetch(`${apiUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return readSession(response, "Sign in failed.");
}

export type RegisterDetails = {
  email: string;
  password: string;
  role: "Student" | "Staff";
  campusIdentifier: string;
  firstName: string;
  lastName: string;
  phone?: string;
};

export type ActivitySummary = {
  visits: number;
  classesBooked: number;
  equipmentSessions: number;
  challengesJoined: number;
  recent: Array<{
    kind: "visit" | "class" | "equipment" | "challenge";
    title: string;
    detail: string;
    occurredAt: string;
  }>;
  prompts: Array<{
    kind: "class" | "wellness";
    title: string;
    message: string;
  }>;
};

// Membership shown on the member screen. termDays is 120 for students and 365 for staff.
export type MembershipDetails = {
  id: number;
  userId: number;
  status: "Pending" | "Active" | "Frozen" | "Expired";
  memberType: "Student" | "Staff";
  startDate: string;
  expiryDate: string;
  termDays: number;
  canEnter: boolean;
};

// Contact details the member can change. Email and campus identifier stay fixed.
export type MemberProfile = {
  id: number;
  email: string;
  role: string;
  campusIdentifier: string;
  firstName: string;
  lastName: string;
  phone: string | null;
};

async function readProfile(response: Response, fallback: string): Promise<MemberProfile> {
  const body = (await response.json()) as MemberProfile & { error?: { message?: string } };
  if (response.status === 401) {
    throw new Error("UNAUTHENTICATED");
  }
  if (!response.ok) {
    throw new Error(body.error?.message ?? fallback);
  }
  return body;
}

export async function getProfile(accessToken: string): Promise<MemberProfile> {
  const response = await fetch(`${apiUrl}/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return readProfile(response, "Could not load your profile.");
}

export async function updateProfile(
  accessToken: string,
  details: { firstName: string; lastName: string; phone: string | null },
): Promise<MemberProfile> {
  const response = await fetch(`${apiUrl}/me`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(details),
  });
  return readProfile(response, "Could not save your profile.");
}

export type AccessPass = {
  token: string;
  expiresAt: string;
  expiresIn: number;
  kind: "Standard";
};

export async function issueAccessPass(accessToken: string): Promise<AccessPass> {
  const response = await fetch(`${apiUrl}/access/passes`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const body = (await response.json()) as AccessPass & { error?: { message?: string } };
  if (response.status === 401) {
    throw new Error("UNAUTHENTICATED");
  }
  if (!response.ok) {
    throw new Error(body.error?.message ?? "Could not issue a pass.");
  }
  return body;
}

export async function getMembership(accessToken: string): Promise<MembershipDetails> {
  const response = await fetch(`${apiUrl}/memberships/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const body = (await response.json()) as MembershipDetails & { error?: { message?: string } };
  if (response.status === 401) {
    throw new Error("UNAUTHENTICATED");
  }
  if (!response.ok) {
    throw new Error(body.error?.message ?? "Could not load your membership.");
  }
  return body;
}

export async function getActivitySummary(accessToken: string): Promise<ActivitySummary> {
  const response = await fetch(`${apiUrl}/activity/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const body = (await response.json()) as ActivitySummary & { error?: { message?: string } };
  if (response.status === 401) {
    throw new Error("UNAUTHENTICATED");
  }
  if (!response.ok) {
    throw new Error(body.error?.message ?? "Could not load your activity.");
  }
  return body;
}

export async function register(details: RegisterDetails): Promise<MemberSession> {
  const response = await fetch(`${apiUrl}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(details),
  });
  return readSession(response, "Registration failed.");
}
