import { createHash, randomBytes } from "node:crypto";
import sql from "mssql";
import { getPool } from "../../db/pool.js";

const refreshDays = 7;

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function newRefreshToken(): string {
  return randomBytes(32).toString("base64url");
}

export class RefreshTokenRepository {
  async insert(userId: number, tokenHash: string, tx?: sql.Transaction): Promise<void> {
    const request = tx ? new sql.Request(tx) : (await getPool()).request();
    await request
      .input("userId", sql.Int, userId)
      .input("tokenHash", sql.NVarChar(128), tokenHash)
      .input("days", sql.Int, refreshDays)
      .query(`
        INSERT INTO dbo.RefreshTokens (UserId, TokenHash, ExpiresAt)
        VALUES (@userId, @tokenHash, DATEADD(DAY, @days, SYSUTCDATETIME()))
      `);
  }

  async findActive(tokenHash: string): Promise<{ id: number; userId: number } | null> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("tokenHash", sql.NVarChar(128), tokenHash)
      .query<{ Id: number; UserId: number }>(`
        SELECT Id, UserId
        FROM dbo.RefreshTokens
        WHERE TokenHash = @tokenHash
          AND RevokedAt IS NULL
          AND ExpiresAt > SYSUTCDATETIME()
      `);
    const row = result.recordset[0];
    return row ? { id: row.Id, userId: row.UserId } : null;
  }

  async revoke(id: number): Promise<void> {
    const pool = await getPool();
    await pool
      .request()
      .input("id", sql.Int, id)
      .query(`UPDATE dbo.RefreshTokens SET RevokedAt = SYSUTCDATETIME() WHERE Id = @id`);
  }
}
