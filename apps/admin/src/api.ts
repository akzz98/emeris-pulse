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

export type TemporaryPass = {
  token: string;
  expiresAt: string;
  expiresIn: number;
  kind: "Temporary";
  member: { firstName: string; lastName: string; email: string };
};

export async function issueTemporaryPass(accessToken: string, email: string): Promise<TemporaryPass> {
  const response = await fetch(`${apiUrl}/access/passes/temporary`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
  });
  const body = (await response.json()) as TemporaryPass & { error?: { message?: string } };
  if (response.status === 401) {
    throw new Error("UNAUTHENTICATED");
  }
  if (!response.ok) {
    throw new Error(body.error?.message ?? "Could not issue a temporary pass.");
  }
  return body;
}

export type Occupancy = {
  windowMinutes: number;
  onFloor: number;
  members: Array<{ firstName: string; lastName: string; enteredAt: string }>;
};

export async function getOccupancy(accessToken: string): Promise<Occupancy> {
  const response = await fetch(`${apiUrl}/access/occupancy`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const body = (await response.json()) as Occupancy & { error?: { message?: string } };
  if (response.status === 401) {
    throw new Error("UNAUTHENTICATED");
  }
  if (!response.ok) {
    throw new Error(body.error?.message ?? "Could not load occupancy.");
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

export type ManagedClass = {
  id: number;
  title: string;
  instructorEmail: string;
  instructorName: string;
  startsAt: string;
  endsAt: string;
  location: string;
  capacity: number;
  bookedCount: number;
  status: string;
};

export type InstructorOption = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
};

export type ClassDraft = {
  title: string;
  instructorEmail: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  location: string;
};

async function readAdmin<T>(response: Response, fallback: string): Promise<T> {
  const body = (await response.json()) as T & { error?: { message?: string } };
  if (response.status === 401) {
    throw new Error("UNAUTHENTICATED");
  }
  if (!response.ok) {
    throw new Error(body.error?.message ?? fallback);
  }
  return body;
}

export type OpenTicket = {
  id: number;
  status: "Open" | "InProgress" | "Closed";
  description: string;
  openedAt: string;
  equipmentId: number;
  code: string;
  name: string;
  location: string;
  equipmentStatus: "Available" | "OutOfService";
  reportedBy: string;
};

export async function getTicketQueue(accessToken: string): Promise<{ tickets: OpenTicket[] }> {
  const response = await fetch(`${apiUrl}/equipment/tickets`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return readAdmin(response, "Could not load the ticket queue.");
}

export async function takeEquipmentOutOfService(
  accessToken: string,
  equipmentId: number,
): Promise<{ name: string; status: "OutOfService" }> {
  const response = await fetch(`${apiUrl}/equipment/${equipmentId}/out-of-service`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return readAdmin(response, "Could not take this machine out of service.");
}

export async function getManagedClasses(
  accessToken: string,
): Promise<{ classes: ManagedClass[]; instructors: InstructorOption[] }> {
  const response = await fetch(`${apiUrl}/classes/manage`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return readAdmin(response, "Could not load the timetable.");
}

export async function publishClass(accessToken: string, draft: ClassDraft): Promise<{ id: number }> {
  const response = await fetch(`${apiUrl}/classes`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(draft),
  });
  return readAdmin(response, "Could not publish the class.");
}

export async function updateClass(accessToken: string, classId: number, draft: ClassDraft): Promise<void> {
  const response = await fetch(`${apiUrl}/classes/${classId}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(draft),
  });
  await readAdmin(response, "Could not update the class.");
}
