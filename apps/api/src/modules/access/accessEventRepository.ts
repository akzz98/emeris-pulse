import sql from "mssql";
import { getPool } from "../../db/pool.js";

export type AccessResult = "Granted" | "Refused";

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
