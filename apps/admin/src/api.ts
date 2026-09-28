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

export type Utilisation = {
  visitsToday: number;
  visitsThisWeek: number;
  peakHours: number[];
  hours: Array<{ hour: number; visits: number }>;
};

export async function getUtilisation(accessToken: string): Promise<Utilisation> {
  const response = await fetch(`${apiUrl}/access/utilisation`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const body = (await response.json()) as Utilisation & { error?: { message?: string } };
  if (response.status === 401) {
    throw new Error("UNAUTHENTICATED");
  }
  if (!response.ok) {
    throw new Error(body.error?.message ?? "Could not load utilisation.");
  }
  return body;
}

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

export type ClassFill = {
  id: number;
  title: string;
  startsAt: string;
  location: string;
  capacity: number;
  filled: number;
  fillRate: number;
};

export type ClassFillReport = {
  filled: number;
  seats: number;
  fillRate: number;
  classes: ClassFill[];
};

export type DowntimeMachine = {
  id: number;
  code: string;
  name: string;
  location: string;
  status: "Available" | "OutOfService";
  openTickets: number;
  openSince: string | null;
  hoursDown: number | null;
};

export type DowntimeReport = {
  total: number;
  outOfService: number;
  machines: DowntimeMachine[];
};

export async function getClassFill(accessToken: string): Promise<ClassFillReport> {
  const response = await fetch(`${apiUrl}/reports/class-fill`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return readAdmin(response, "Could not load the class fill report.");
}

export type WellnessChallenge = {
  id: number;
  title: string;
  startsOn: string;
  endsOn: string;
  phase: "Open" | "Upcoming" | "Ended";
  participants: number;
};

export type WellnessReport = {
  people: number;
  enrolments: number;
  challenges: WellnessChallenge[];
};

export async function getWellnessParticipation(accessToken: string): Promise<WellnessReport> {
  const response = await fetch(`${apiUrl}/reports/wellness`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return readAdmin(response, "Could not load the wellness report.");
}

export async function getEquipmentDowntime(accessToken: string): Promise<DowntimeReport> {
  const response = await fetch(`${apiUrl}/reports/equipment-downtime`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return readAdmin(response, "Could not load the downtime report.");
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

export async function closeTicket(
  accessToken: string,
  ticketId: number,
): Promise<{ name: string; returned: boolean; equipmentStatus: "Available" | "OutOfService" }> {
  const response = await fetch(`${apiUrl}/equipment/tickets/${ticketId}/close`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return readAdmin(response, "Could not close this ticket.");
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

export type ManagedChallenge = {
  id: number;
  title: string;
  description: string;
  startsOn: string;
  endsOn: string;
  phase: "Open" | "Upcoming" | "Ended";
  joinedCount: number;
};

export type ChallengeDraft = {
  title: string;
  description: string;
  startsOn: string;
  endsOn: string;
};

export async function getManagedChallenges(accessToken: string): Promise<{ challenges: ManagedChallenge[] }> {
  const response = await fetch(`${apiUrl}/challenges/manage`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return readAdmin(response, "Could not load challenges.");
}

export async function createChallenge(accessToken: string, draft: ChallengeDraft): Promise<{ id: number; title: string }> {
  const response = await fetch(`${apiUrl}/challenges`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(draft),
  });
  return readAdmin(response, "Could not create this challenge.");
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

export async function updateClass(
  accessToken: string,
  classId: number,
  draft: ClassDraft,
): Promise<{ notified: number }> {
  const response = await fetch(`${apiUrl}/classes/${classId}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(draft),
  });
  return readAdmin(response, "Could not update the class.");
}

export async function broadcastNotice(
  accessToken: string,
  notice: { title: string; message: string; roles: string[] },
): Promise<{ notified: number }> {
  const response = await fetch(`${apiUrl}/notices/broadcast`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(notice),
  });
  return readAdmin(response, "Could not send this broadcast.");
}

export async function announceClosure(
  accessToken: string,
  closure: { startsOn: string; endsOn: string; reason: string },
): Promise<{ notified: number }> {
  const response = await fetch(`${apiUrl}/notices/closure`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(closure),
  });
  return readAdmin(response, "Could not send the closure notice.");
}
