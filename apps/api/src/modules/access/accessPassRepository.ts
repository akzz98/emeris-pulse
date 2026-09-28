import { randomUUID } from "node:crypto";
import sql from "mssql";
import { getPool } from "../../db/pool.js";

export type AccessPassRecord = {
  id: number;
  jti: string;
  expiresAt: Date;
};

type PassRow = {
  Id: number;
  Jti: string;
  ExpiresAt: Date;
};

export class AccessPassRepository {
  async insert(userId: number, jti: string, expiresAt: Date): Promise<AccessPassRecord> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("userId", sql.Int, userId)
      .input("jti", sql.NVarChar(64), jti)
      .input("expiresAt", sql.DateTime2, expiresAt)
      .query<PassRow>(`
        INSERT INTO dbo.AccessPasses (UserId, Jti, Kind, ExpiresAt)
        OUTPUT INSERTED.Id, INSERTED.Jti, INSERTED.ExpiresAt
        VALUES (@userId, @jti, N'Standard', @expiresAt)
      `);
    const row = result.recordset[0];
    return { id: row.Id, jti: row.Jti, expiresAt: row.ExpiresAt };
  }
}

export function newPassId(): string {
  return randomUUID();
}
