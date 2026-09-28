import sql from "mssql";
import type { Role } from "../../domain/roles.js";
import { getPool } from "../../db/pool.js";

function asUtc(value: string): string {
  return value.endsWith("Z") ? value : `${value}Z`;
}

export type MemberNotice = {
  id: number;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
};

// Closure and broadcast notices are stored for the member app. No mail provider is called.
export class NoticesRepository {
  async listForUser(userId: number): Promise<MemberNotice[]> {
    const pool = await getPool();
    const result = await pool.request().input("userId", sql.Int, userId).query<{
      Id: number;
      Title: string;
      Body: string;
      CreatedAt: string;
      ReadAt: string | null;
    }>(`
      SELECT
        Id,
        Title,
        Body,
        CONVERT(varchar(33), CreatedAt, 127) AS CreatedAt,
        CONVERT(varchar(33), ReadAt, 127) AS ReadAt
      FROM dbo.Notifications
      WHERE UserId = @userId
      ORDER BY CreatedAt DESC, Id DESC
    `);
    return result.recordset.map((row) => ({
      id: row.Id,
      title: row.Title,
      body: row.Body,
      createdAt: asUtc(row.CreatedAt),
      read: row.ReadAt !== null,
    }));
  }

  async notifyClassMembers(startsOn: string, endsOn: string, title: string, body: string): Promise<number> {
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      const found = await new sql.Request(transaction)
        .input("startsOn", sql.NVarChar(10), startsOn)
        .input("endsOn", sql.NVarChar(10), endsOn)
        .query<{ UserId: number }>(`
          SELECT DISTINCT b.UserId
          FROM dbo.Bookings b WITH (UPDLOCK, HOLDLOCK)
          INNER JOIN dbo.ClassSessions cs ON cs.Id = b.ClassSessionId
          WHERE b.Status IN (N'Booked', N'Waitlisted')
            AND cs.Status = N'Scheduled'
            AND CAST(cs.StartsAt AS DATE) >= CAST(@startsOn AS DATE)
            AND CAST(cs.StartsAt AS DATE) <= CAST(@endsOn AS DATE)
        `);
      for (const row of found.recordset) {
        await new sql.Request(transaction)
          .input("userId", sql.Int, row.UserId)
          .input("title", sql.NVarChar(160), title)
          .input("body", sql.NVarChar(600), body)
          .query(`
            INSERT INTO dbo.Notifications (UserId, Title, Body)
            VALUES (@userId, @title, @body)
          `);
      }
      await transaction.commit();
      return found.recordset.length;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async notifyRoles(roles: Role[], title: string, body: string): Promise<number> {
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      const request = new sql.Request(transaction);
      const placeholders = roles.map((role, index) => {
        request.input(`role${index}`, sql.NVarChar(32), role);
        return `@role${index}`;
      });
      const found = await request.query<{ Id: number }>(`
        SELECT Id
        FROM dbo.Users
        WHERE Role IN (${placeholders.join(", ")})
      `);
      for (const row of found.recordset) {
        await new sql.Request(transaction)
          .input("userId", sql.Int, row.Id)
          .input("title", sql.NVarChar(160), title)
          .input("body", sql.NVarChar(600), body)
          .query(`
            INSERT INTO dbo.Notifications (UserId, Title, Body)
            VALUES (@userId, @title, @body)
          `);
      }
      await transaction.commit();
      return found.recordset.length;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}
