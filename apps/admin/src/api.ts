const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export type AdminSession = {
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

type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  user: AdminSession["user"];
};

export async function login(email: string, password: string): Promise<AdminSession> {
  const response = await fetch(`${apiUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const body = (await response.json()) as LoginResponse & { error?: { message?: string } };
  if (!response.ok) {
    throw new Error(body.error?.message ?? "Sign in failed.");
  }
  return { accessToken: body.accessToken, refreshToken: body.refreshToken, user: body.user };
}

export type AccessLog = {
  page: number;
  pageSize: number;
  total: number;
  events: Array<{
    id: number;
    occurredAt: string;
    result: "Granted" | "Refused";
    reason: string | null;
    firstName: string;
    lastName: string;
    email: string;
  }>;
};

export async function getAccessLog(accessToken: string, page: number): Promise<AccessLog> {
  // Three rows per page so the desk can move through the log.
  const response = await fetch(`${apiUrl}/access/events?page=${page}&pageSize=3`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const body = (await response.json()) as AccessLog & { error?: { message?: string } };
  if (response.status === 401) {
    throw new Error("UNAUTHENTICATED");
  }
  if (!response.ok) {
    throw new Error(body.error?.message ?? "Could not load the access log.");
  }
  return body;
}

export type RedeemResult = {
  result: "Granted";
};

export async function redeemPass(token: string): Promise<RedeemResult> {
  const response = await fetch(`${apiUrl}/access/redeem`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  const body = (await response.json()) as RedeemResult & { error?: { message?: string } };
  if (!response.ok) {
    throw new Error(body.error?.message ?? "The scan could not be recorded.");
  }
  return body;
}
