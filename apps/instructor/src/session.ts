import type { InstructorSession } from "./api";

const storageKey = "emeris-pulse-instructor-session";

export function loadSession(): InstructorSession | null {
  const raw = localStorage.getItem(storageKey);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as InstructorSession;
  } catch {
    localStorage.removeItem(storageKey);
    return null;
  }
}

export function saveSession(session: InstructorSession) {
  localStorage.setItem(storageKey, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(storageKey);
}
