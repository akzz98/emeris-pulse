import sql from "mssql";
import type { MemberType, MembershipStatus } from "../../domain/membership.js";
import { getPool } from "../../db/pool.js";

export type MembershipRecord = {
  id: number;
  userId: number;
  memberType: MemberType;
  status: MembershipStatus;
  startDate: string;
  expiryDate: string;
};

export type PendingMembershipRecord = MembershipRecord & {
  email: string;
  campusIdentifier: string;
  firstName: string;
  lastName: string;
};

type MembershipRow = {
  Id: number;
  UserId: number;
  MemberType: MemberType;
  Status: MembershipStatus;
  StartDate: string;
  ExpiryDate: string;
};

function mapMembership(row: MembershipRow): MembershipRecord {
  return {
    id: row.Id,
    userId: row.UserId,
    memberType: row.MemberType,
    status: row.Status,
    startDate: row.StartDate,
    expiryDate: row.ExpiryDate,
  };
}

const membershipColumns = `
  Id, UserId, MemberType, Status,
  CONVERT(char(10), StartDate, 23) AS StartDate,
  CONVERT(char(10), ExpiryDate, 23) AS ExpiryDate
`;

export class MembershipRepository {
  async findByUserId(userId: number, tx?: sql.Transaction): Promise<MembershipRecord | null> {
    const request = tx ? new sql.Request(tx) : (await getPool()).request();
    const result = await request
      .input("userId", sql.Int, userId)
      .query<MembershipRow>(`SELECT ${membershipColumns} FROM dbo.Memberships WHERE UserId = @userId`);
    const row = result.recordset[0];
    return row ? mapMembership(row) : null;
  }

  async insert(
    input: {
      userId: number;
      memberType: MemberType;
      status: MembershipStatus;
      startDate: string;
      expiryDate: string;
    },
    tx: sql.Transaction,
  ): Promise<MembershipRecord> {
    const result = await new sql.Request(tx)
      .input("userId", sql.Int, input.userId)
      .input("memberType", sql.NVarChar(16), input.memberType)
      .input("status", sql.NVarChar(16), input.status)
      .input("startDate", sql.Date, input.startDate)
      .input("expiryDate", sql.Date, input.expiryDate)
      .query<MembershipRow>(`
        INSERT INTO dbo.Memberships (UserId, MemberType, Status, StartDate, ExpiryDate)
        OUTPUT INSERTED.Id, INSERTED.UserId, INSERTED.MemberType, INSERTED.Status,
               CONVERT(char(10), INSERTED.StartDate, 23) AS StartDate,
               CONVERT(char(10), INSERTED.ExpiryDate, 23) AS ExpiryDate
        VALUES (@userId, @memberType, @status, @startDate, @expiryDate)
      `);
    return mapMembership(result.recordset[0]);
  }

  async listByStatus(status: MembershipStatus): Promise<PendingMembershipRecord[]> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("status", sql.NVarChar(16), status)
      .query<
      MembershipRow & {
        Email: string;
        CampusIdentifier: string;
        FirstName: string;
        LastName: string;
      }
    >(`
      SELECT m.Id, m.UserId, m.MemberType, m.Status,
             CONVERT(char(10), m.StartDate, 23) AS StartDate,
             CONVERT(char(10), m.ExpiryDate, 23) AS ExpiryDate,
             u.Email, u.CampusIdentifier, u.FirstName, u.LastName
      FROM dbo.Memberships AS m
      INNER JOIN dbo.Users AS u ON u.Id = m.UserId
      WHERE m.Status = @status
      ORDER BY u.LastName, u.FirstName, m.Id
    `);
    return result.recordset.map((row) => ({
      ...mapMembership(row),
      email: row.Email,
      campusIdentifier: row.CampusIdentifier,
      firstName: row.FirstName,
      lastName: row.LastName,
    }));
  }

  async updateStatus(userId: number, status: MembershipStatus): Promise<void> {
    const pool = await getPool();
    await pool
      .request()
      .input("userId", sql.Int, userId)
      .input("status", sql.NVarChar(16), status)
      .query(`
        UPDATE dbo.Memberships
        SET Status = @status, UpdatedAt = SYSUTCDATETIME()
        WHERE UserId = @userId
      `);
  }
}
