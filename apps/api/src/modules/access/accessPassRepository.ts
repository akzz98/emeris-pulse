import { randomUUID } from "node:crypto";
import sql from "mssql";
import { getPool } from "../../db/pool.js";

export type AccessPassRecord = {
  id: number;
  userId: number;
  jti: string;
  expiresAt: Date;
  usedAt: Date | null;
};

type PassRow = {
  Id: number;
  UserId: number;
  Jti: string;
  ExpiresAt: Date;
  UsedAt: Date | null;
};

const passColumns = `Id, UserId, Jti, ExpiresAt, UsedAt`;

function mapPass(row: PassRow): AccessPassRecord {
  return {
    id: row.Id,
    userId: row.UserId,
    jti: row.Jti,
    expiresAt: row.ExpiresAt,
    usedAt: row.UsedAt,
  };
}

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
        OUTPUT INSERTED.Id, INSERTED.UserId, INSERTED.Jti, INSERTED.ExpiresAt, INSERTED.UsedAt
        VALUES (@userId, @jti, N'Standard', @expiresAt)
      `);
    return mapPass(result.recordset[0]);
  }

  async findByJti(jti: string): Promise<AccessPassRecord | null> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("jti", sql.NVarChar(64), jti)
      .query<PassRow>(`SELECT ${passColumns} FROM dbo.AccessPasses WHERE Jti = @jti`);
    const row = result.recordset[0];
    return row ? mapPass(row) : null;
  }

  // One update wins. A second scan finds UsedAt already set and is rejected.
  async consumeOnce(jti: string, userId: number): Promise<number | null> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("jti", sql.NVarChar(64), jti)
      .input("userId", sql.Int, userId)
      .query<{ Id: number }>(`
        UPDATE dbo.AccessPasses
        SET UsedAt = SYSUTCDATETIME()
        OUTPUT INSERTED.Id
        WHERE Jti = @jti AND UserId = @userId AND UsedAt IS NULL AND ExpiresAt > SYSUTCDATETIME()
      `);
    return result.recordset[0]?.Id ?? null;
  }
}

export function newPassId(): string {
  return randomUUID();
}
