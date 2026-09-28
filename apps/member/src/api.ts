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

export async function register(details: RegisterDetails): Promise<MemberSession> {
  const response = await fetch(`${apiUrl}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(details),
  });
  return readSession(response, "Registration failed.");
}
