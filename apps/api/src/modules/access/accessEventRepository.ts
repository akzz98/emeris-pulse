import sql from "mssql";
import { getPool } from "../../db/pool.js";

export type AccessResult = "Granted" | "Refused";

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
}
