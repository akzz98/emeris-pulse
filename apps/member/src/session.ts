const storageKey = "emeris-pulse-member-session";

export type MemberSession = {
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

export function loadSession(): MemberSession | null {
  const raw = localStorage.getItem(storageKey);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as MemberSession;
  } catch {
    localStorage.removeItem(storageKey);
    return null;
  }
}

export function saveSession(session: MemberSession) {
  localStorage.setItem(storageKey, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(storageKey);
}
