import sql from "mssql";
import { getPool } from "../../db/pool.js";

function asUtc(value: string | null): string | null {
  if (!value) {
    return null;
  }
  return value.endsWith("Z") ? value : `${value}Z`;
}

export type ClassFillRow = {
  id: number;
  title: string;
  startsAt: string;
  location: string;
  capacity: number;
  filled: number;
};

export type WellnessRow = {
  id: number;
  title: string;
  startsOn: string;
  endsOn: string;
  phase: "Open" | "Upcoming" | "Ended";
  participants: number;
};

export type DowntimeRow = {
  id: number;
  code: string;
  name: string;
  location: string;
  status: "Available" | "OutOfService";
  openTickets: number;
  openSince: string | null;
};

function mapClass(row: {
  Id: number;
  Title: string;
  StartsAt: string;
  Location: string;
  Capacity: number;
  Filled: number;
}): ClassFillRow {
  return {
    id: row.Id,
    title: row.Title,
    startsAt: row.StartsAt,
    location: row.Location,
    capacity: Number(row.Capacity),
    filled: Number(row.Filled),
  };
}

export class ReportsRepository {
  // A held seat is Booked, Attended, or Absent. Waitlisted members are not in the room.
  // IX_ClassSessions_Status_StartsAt pages the classes. IX_Bookings_Class_Status counts seats.
  async classFill(
    page: number,
    pageSize: number,
  ): Promise<{ total: number; seats: number; filled: number; classes: ClassFillRow[] }> {
    const pool = await getPool();
    const offset = (page - 1) * pageSize;
    const totals = await pool.request().query<{ Total: number; Seats: number; Filled: number }>(`
      SELECT
        COUNT(*) AS Total,
        COALESCE(SUM(held.Capacity), 0) AS Seats,
        COALESCE(SUM(held.Filled), 0) AS Filled
      FROM (
        SELECT
          cs.Capacity,
          (
            SELECT COUNT(*)
            FROM dbo.Bookings b
            WHERE b.ClassSessionId = cs.Id
              AND b.Status IN (N'Booked', N'Attended', N'Absent')
          ) AS Filled
        FROM dbo.ClassSessions cs
        WHERE cs.Status IN (N'Scheduled', N'Completed')
      ) held
    `);
    const result = await pool
      .request()
      .input("offset", sql.Int, offset)
      .input("pageSize", sql.Int, pageSize)
      .query<{
        Id: number;
        Title: string;
        StartsAt: string;
        Location: string;
        Capacity: number;
        Filled: number;
      }>(`
        SELECT
          cs.Id,
          cs.Title,
          CONVERT(varchar(33), cs.StartsAt, 126) AS StartsAt,
          cs.Location,
          cs.Capacity,
          (
            SELECT COUNT(*)
            FROM dbo.Bookings b
            WHERE b.ClassSessionId = cs.Id
              AND b.Status IN (N'Booked', N'Attended', N'Absent')
          ) AS Filled
        FROM dbo.ClassSessions cs
        WHERE cs.Status IN (N'Scheduled', N'Completed')
        ORDER BY cs.StartsAt DESC, cs.Id DESC
        OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
      `);
    const summary = totals.recordset[0];
    return {
      total: Number(summary?.Total ?? 0),
      seats: Number(summary?.Seats ?? 0),
      filled: Number(summary?.Filled ?? 0),
      classes: result.recordset.map(mapClass),
    };
  }

  // Current downtime starts at the earliest ticket that is still open.
  // Only out-of-service machines are listed. The index hint keeps that page on IX_Equipment_Status.
  async equipmentDowntime(
    page: number,
    pageSize: number,
  ): Promise<{ total: number; outOfService: number; machines: DowntimeRow[] }> {
    const pool = await getPool();
    const offset = (page - 1) * pageSize;
    const counts = await pool.request().query<{ Total: number; OutOfService: number }>(`
      SELECT
        COUNT(*) AS Total,
        COALESCE(SUM(CASE WHEN Status = N'OutOfService' THEN 1 ELSE 0 END), 0) AS OutOfService
      FROM dbo.Equipment
    `);
    const result = await pool
      .request()
      .input("offset", sql.Int, offset)
      .input("pageSize", sql.Int, pageSize)
      .query<{
        Id: number;
        Code: string;
        Name: string;
        Location: string;
        Status: "Available" | "OutOfService";
        OpenTickets: number;
        OpenSince: string | null;
      }>(`
        SELECT
          e.Id,
          e.Code,
          e.Name,
          e.Location,
          e.Status,
          (
            SELECT COUNT(*)
            FROM dbo.MaintenanceTickets t
            WHERE t.EquipmentId = e.Id AND t.Status IN (N'Open', N'InProgress')
          ) AS OpenTickets,
          CONVERT(varchar(33), (
            SELECT MIN(t.OpenedAt)
            FROM dbo.MaintenanceTickets t
            WHERE t.EquipmentId = e.Id AND t.Status IN (N'Open', N'InProgress')
          ), 127) AS OpenSince
        FROM dbo.Equipment e WITH (INDEX(IX_Equipment_Status))
        WHERE e.Status = N'OutOfService'
        ORDER BY e.Code, e.Id
        OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
      `);
    const summary = counts.recordset[0];
    return {
      total: Number(summary?.Total ?? 0),
      outOfService: Number(summary?.OutOfService ?? 0),
      machines: result.recordset.map((row) => ({
        id: row.Id,
        code: row.Code,
        name: row.Name,
        location: row.Location,
        status: row.Status,
        openTickets: Number(row.OpenTickets),
        openSince: asUtc(row.OpenSince),
      })),
    };
  }

  // One row per challenge. A person who joins two challenges is counted on each.
  // IX_Challenges_StartsOn pages the challenges. UQ_ChallengeEnrolments_Challenge_User counts joins.
  async wellnessParticipation(
    page: number,
    pageSize: number,
  ): Promise<{ people: number; enrolments: number; total: number; challenges: WellnessRow[] }> {
    const pool = await getPool();
    const offset = (page - 1) * pageSize;
    const totals = await pool.request().query<{ People: number; Enrolments: number; Total: number }>(`
      SELECT
        (SELECT COUNT(DISTINCT UserId) FROM dbo.ChallengeEnrolments) AS People,
        (SELECT COUNT(*) FROM dbo.ChallengeEnrolments) AS Enrolments,
        (SELECT COUNT(*) FROM dbo.Challenges) AS Total
    `);
    const challenges = await pool
      .request()
      .input("offset", sql.Int, offset)
      .input("pageSize", sql.Int, pageSize)
      .query<{
        Id: number;
        Title: string;
        StartsOn: string;
        EndsOn: string;
        Phase: "Open" | "Upcoming" | "Ended";
        Participants: number;
      }>(`
        SELECT
          c.Id,
          c.Title,
          CONVERT(char(10), c.StartsOn, 23) AS StartsOn,
          CONVERT(char(10), c.EndsOn, 23) AS EndsOn,
          CASE
            WHEN c.EndsOn < CAST(GETDATE() AS DATE) THEN N'Ended'
            WHEN c.StartsOn > CAST(GETDATE() AS DATE) THEN N'Upcoming'
            ELSE N'Open'
          END AS Phase,
          (
            SELECT COUNT(*)
            FROM dbo.ChallengeEnrolments ce
            WHERE ce.ChallengeId = c.Id
          ) AS Participants
        FROM dbo.Challenges c
        ORDER BY c.StartsOn DESC, c.Id DESC
        OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
      `);
    const summary = totals.recordset[0];
    return {
      people: Number(summary?.People ?? 0),
      enrolments: Number(summary?.Enrolments ?? 0),
      total: Number(summary?.Total ?? 0),
      challenges: challenges.recordset.map((row) => ({
        id: row.Id,
        title: row.Title,
        startsOn: row.StartsOn,
        endsOn: row.EndsOn,
        phase: row.Phase,
        participants: Number(row.Participants),
      })),
    };
  }
}
