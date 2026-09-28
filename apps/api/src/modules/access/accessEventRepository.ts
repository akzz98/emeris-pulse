import sql from "mssql";
import { getPool } from "../../db/pool.js";

export type AccessResult = "Granted" | "Refused";

export type Occupant = {
  firstName: string;
  lastName: string;
  enteredAt: string;
};

type OccupantRow = {
  FirstName: string;
  LastName: string;
  EnteredAt: Date;
};

export type AccessLogEntry = {
  id: number;
  occurredAt: string;
  result: AccessResult;
  reason: string | null;
  firstName: string;
  lastName: string;
  email: string;
};

type LogRow = {
  Id: number;
  OccurredAt: Date;
  Result: AccessResult;
  Reason: string | null;
  FirstName: string;
  LastName: string;
  Email: string;
  Total: number;
};

export class AccessEventRepository {
  async insert(input: {
    userId: number;
    passId: number | null;
    result: AccessResult;
    reason: string | null;
  }): Promise<void> {
    const pool = await getPool();
    await pool
      .request()
      .input("userId", sql.Int, input.userId)
      .input("passId", sql.Int, input.passId)
      .input("result", sql.NVarChar(16), input.result)
      .input("reason", sql.NVarChar(200), input.reason)
      .query(`
        INSERT INTO dbo.AccessEvents (UserId, PassId, OccurredAt, Result, Reason)
        VALUES (@userId, @passId, SYSUTCDATETIME(), @result, @reason)
      `);
  }

  // No exit scan exists yet. A granted entry counts as still on the floor for the visit window.
  async occupants(windowMinutes: number): Promise<Occupant[]> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("windowMinutes", sql.Int, windowMinutes)
      .query<OccupantRow>(`
        SELECT
          u.FirstName,
          u.LastName,
          MAX(e.OccurredAt) AS EnteredAt
        FROM dbo.AccessEvents e
        INNER JOIN dbo.Users u ON u.Id = e.UserId
        WHERE e.Result = N'Granted'
          AND e.OccurredAt >= DATEADD(minute, -@windowMinutes, SYSUTCDATETIME())
        GROUP BY u.Id, u.FirstName, u.LastName
        ORDER BY MAX(e.OccurredAt) DESC
      `);
    return result.recordset.map((row) => ({
      firstName: row.FirstName,
      lastName: row.LastName,
      enteredAt: new Date(row.EnteredAt).toISOString(),
    }));
  }

  // Granted visits only. The hint keeps the date range on IX_AccessEvents_OccurredAt.
  // Hours are shifted to campus time (UTC+2) so a morning arrival is not counted as the night before.
  async utilisation(): Promise<{ visitsToday: number; visitsThisWeek: number; hours: Array<{ hour: number; visits: number }> }> {
    const pool = await getPool();
    const today = await pool.request().query<{ Visits: number }>(`
      SELECT COUNT(*) AS Visits
      FROM dbo.AccessEvents WITH (INDEX(IX_AccessEvents_OccurredAt))
      WHERE Result = N'Granted'
        AND OccurredAt >= DATEADD(
          hour,
          -2,
          CAST(CAST(DATEADD(hour, 2, SYSUTCDATETIME()) AS DATE) AS DATETIME2)
        )
    `);
    const week = await pool.request().query<{ HourOfDay: number; Visits: number }>(`
      SELECT
        DATEPART(hour, DATEADD(hour, 2, OccurredAt)) AS HourOfDay,
        COUNT(*) AS Visits
      FROM dbo.AccessEvents WITH (INDEX(IX_AccessEvents_OccurredAt))
      WHERE Result = N'Granted'
        AND OccurredAt >= DATEADD(day, -7, SYSUTCDATETIME())
      GROUP BY DATEPART(hour, DATEADD(hour, 2, OccurredAt))
    `);
    const counts = new Map(week.recordset.map((row) => [Number(row.HourOfDay), Number(row.Visits)]));
    const hours = Array.from({ length: 24 }, (_, hour) => ({ hour, visits: counts.get(hour) ?? 0 }));
    return {
      visitsToday: Number(today.recordset[0]?.Visits ?? 0),
      visitsThisWeek: hours.reduce((sum, hour) => sum + hour.visits, 0),
      hours,
    };
  }

  // Newest scans first. OccurredAt is indexed, and OFFSET keeps each page small.
  async page(page: number, pageSize: number): Promise<{ total: number; events: AccessLogEntry[] }> {
    const pool = await getPool();
    const offset = (page - 1) * pageSize;
    const result = await pool
      .request()
      .input("offset", sql.Int, offset)
      .input("pageSize", sql.Int, pageSize)
      .query<LogRow>(`
        SELECT
          e.Id,
          e.OccurredAt,
          e.Result,
          e.Reason,
          u.FirstName,
          u.LastName,
          u.Email,
          COUNT(*) OVER() AS Total
        FROM dbo.AccessEvents e
        INNER JOIN dbo.Users u ON u.Id = e.UserId
        ORDER BY e.OccurredAt DESC, e.Id DESC
        OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
      `);
    const total = result.recordset[0]?.Total ?? 0;
    if (result.recordset.length === 0) {
      const count = await pool.request().query<{ Total: number }>(`SELECT COUNT(*) AS Total FROM dbo.AccessEvents`);
      return { total: Number(count.recordset[0]?.Total ?? 0), events: [] };
    }
    return {
      total: Number(total),
      events: result.recordset.map((row) => ({
        id: row.Id,
        occurredAt: new Date(row.OccurredAt).toISOString(),
        result: row.Result,
        reason: row.Reason,
        firstName: row.FirstName,
        lastName: row.LastName,
        email: row.Email,
      })),
    };
  }
}
