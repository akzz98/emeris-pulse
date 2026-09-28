import sql from "mssql";
import { getPool } from "../../db/pool.js";

export class NoticesRepository {
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
}
