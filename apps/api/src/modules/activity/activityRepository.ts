import sql from "mssql";
import { getPool } from "../../db/pool.js";

export type ActivityKind = "visit" | "class" | "equipment" | "challenge";

export type ActivityCounts = {
  visits: number;
  classesBooked: number;
  equipmentSessions: number;
  challengesJoined: number;
};

export type RecentActivity = {
  kind: ActivityKind;
  title: string;
  detail: string;
  occurredAt: string;
};

type CountRow = {
  Visits: number;
  ClassesBooked: number;
  EquipmentSessions: number;
  ChallengesJoined: number;
};

type RecentRow = {
  Kind: ActivityKind;
  Title: string;
  Detail: string;
  OccurredAt: string;
};

function asUtc(value: string): string {
  return value.endsWith("Z") ? value : `${value}Z`;
}

export class ActivityRepository {
  async countsForUser(userId: number): Promise<ActivityCounts> {
    const pool = await getPool();
    const result = await pool.request().input("userId", sql.Int, userId).query<CountRow>(`
      SELECT
        (SELECT COUNT(*) FROM dbo.AccessEvents
          WHERE UserId = @userId AND Result = N'Granted') AS Visits,
        (SELECT COUNT(*) FROM dbo.Bookings
          WHERE UserId = @userId AND Status IN (N'Booked', N'Attended')) AS ClassesBooked,
        (SELECT COUNT(*) FROM dbo.EquipmentSessions
          WHERE UserId = @userId) AS EquipmentSessions,
        (SELECT COUNT(*) FROM dbo.ChallengeEnrolments
          WHERE UserId = @userId) AS ChallengesJoined
    `);
    const row = result.recordset[0];
    return {
      visits: Number(row?.Visits ?? 0),
      classesBooked: Number(row?.ClassesBooked ?? 0),
      equipmentSessions: Number(row?.EquipmentSessions ?? 0),
      challengesJoined: Number(row?.ChallengesJoined ?? 0),
    };
  }

  async recentForUser(userId: number): Promise<RecentActivity[]> {
    const pool = await getPool();
    const result = await pool.request().input("userId", sql.Int, userId).query<RecentRow>(`
      SELECT TOP 5 Kind, Title, Detail, OccurredAt
      FROM (
        SELECT
          N'visit' AS Kind,
          N'Gym visit' AS Title,
          N'Entry granted' AS Detail,
          CONVERT(varchar(33), OccurredAt, 127) AS OccurredAt
        FROM dbo.AccessEvents
        WHERE UserId = @userId AND Result = N'Granted'
        UNION ALL
        SELECT
          N'class',
          cs.Title,
          b.Status,
          CONVERT(varchar(33), b.CreatedAt, 127)
        FROM dbo.Bookings b
        INNER JOIN dbo.ClassSessions cs ON cs.Id = b.ClassSessionId
        WHERE b.UserId = @userId AND b.Status IN (N'Booked', N'Attended')
        UNION ALL
        SELECT
          N'equipment',
          e.Name,
          e.Location,
          CONVERT(varchar(33), es.StartedAt, 127)
        FROM dbo.EquipmentSessions es
        INNER JOIN dbo.Equipment e ON e.Id = es.EquipmentId
        WHERE es.UserId = @userId
        UNION ALL
        SELECT
          N'challenge',
          c.Title,
          N'Joined',
          CONVERT(varchar(33), ce.JoinedAt, 127)
        FROM dbo.ChallengeEnrolments ce
        INNER JOIN dbo.Challenges c ON c.Id = ce.ChallengeId
        WHERE ce.UserId = @userId
      ) AS Activity
      ORDER BY OccurredAt DESC
    `);
    return result.recordset.map((row) => ({
      kind: row.Kind,
      title: row.Title,
      detail: row.Detail,
      occurredAt: asUtc(row.OccurredAt),
    }));
  }

  // Classes that start between 06:00 and 17:00, so prompts fit a working day.
  async upcomingWorkdayClasses(userId: number): Promise<WorkdayClass[]> {
    const pool = await getPool();
    const result = await pool.request().input("userId", sql.Int, userId).query<WorkdayClassRow>(`
      SELECT TOP 2
        cs.Title,
        cs.Location,
        CONVERT(varchar(33), cs.StartsAt, 126) AS StartsAt,
        CASE WHEN b.Id IS NULL THEN 0 ELSE 1 END AS Booked
      FROM dbo.ClassSessions cs
      LEFT JOIN dbo.Bookings b
        ON b.ClassSessionId = cs.Id AND b.UserId = @userId AND b.Status = N'Booked'
      WHERE cs.Status = N'Scheduled'
        AND cs.StartsAt >= CAST(GETDATE() AS DATETIME2)
        AND DATEPART(HOUR, cs.StartsAt) BETWEEN 6 AND 17
      ORDER BY cs.StartsAt
    `);
    return result.recordset.map((row) => ({
      title: row.Title,
      location: row.Location,
      startsAt: row.StartsAt,
      booked: Number(row.Booked) === 1,
    }));
  }

  async openChallenges(userId: number): Promise<OpenChallenge[]> {
    const pool = await getPool();
    const result = await pool.request().input("userId", sql.Int, userId).query<OpenChallengeRow>(`
      SELECT TOP 1
        c.Title,
        CASE WHEN ce.Id IS NULL THEN 0 ELSE 1 END AS Joined
      FROM dbo.Challenges c
      LEFT JOIN dbo.ChallengeEnrolments ce
        ON ce.ChallengeId = c.Id AND ce.UserId = @userId
      WHERE c.StartsOn <= CAST(GETDATE() AS DATE)
        AND c.EndsOn >= CAST(GETDATE() AS DATE)
      ORDER BY c.StartsOn
    `);
    return result.recordset.map((row) => ({
      title: row.Title,
      joined: Number(row.Joined) === 1,
    }));
  }
}

export type WorkdayClass = {
  title: string;
  location: string;
  startsAt: string;
  booked: boolean;
};

export type OpenChallenge = {
  title: string;
  joined: boolean;
};

type WorkdayClassRow = {
  Title: string;
  Location: string;
  StartsAt: string;
  Booked: number;
};

type OpenChallengeRow = {
  Title: string;
  Joined: number;
};
