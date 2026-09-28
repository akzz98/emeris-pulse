import type { AdminSession } from "./api";

const storageKey = "emeris-pulse-admin-session";

export function loadSession(): AdminSession | null {
  const raw = localStorage.getItem(storageKey);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as AdminSession;
  } catch {
    localStorage.removeItem(storageKey);
    return null;
  }
}

export function saveSession(session: AdminSession) {
  localStorage.setItem(storageKey, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(storageKey);
}
