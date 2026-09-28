import type { MemberSession } from "./session";

const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  user: MemberSession["user"];
};

export async function login(email: string, password: string): Promise<MemberSession> {
  const response = await fetch(`${apiUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const body = (await response.json()) as LoginResponse & {
    error?: { message?: string };
  };
  if (!response.ok) {
    throw new Error(body.error?.message ?? "Sign in failed.");
  }
  return {
    accessToken: body.accessToken,
    refreshToken: body.refreshToken,
    user: body.user,
  };
}
