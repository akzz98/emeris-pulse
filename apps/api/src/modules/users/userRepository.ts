import sql from "mssql";
import type { Role } from "../../domain/roles.js";
import { getPool } from "../../db/pool.js";

export type UserRecord = {
  id: number;
  email: string;
  passwordHash: string;
  role: Role;
  campusIdentifier: string;
  firstName: string;
  lastName: string;
  phone: string | null;
};

type UserRow = {
  Id: number;
  Email: string;
  PasswordHash: string;
  Role: Role;
  CampusIdentifier: string;
  FirstName: string;
  LastName: string;
  Phone: string | null;
};

const userColumns = `
  Id, Email, PasswordHash, Role, CampusIdentifier, FirstName, LastName, Phone
`;

function mapUser(row: UserRow): UserRecord {
  return {
    id: row.Id,
    email: row.Email,
    passwordHash: row.PasswordHash,
    role: row.Role,
    campusIdentifier: row.CampusIdentifier,
    firstName: row.FirstName,
    lastName: row.LastName,
    phone: row.Phone,
  };
}

export class UserRepository {
  async findByEmail(email: string): Promise<UserRecord | null> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("email", sql.NVarChar(255), email)
      .query<UserRow>(`SELECT ${userColumns} FROM dbo.Users WHERE Email = @email`);
    const row = result.recordset[0];
    return row ? mapUser(row) : null;
  }

  async findById(id: number): Promise<UserRecord | null> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("id", sql.Int, id)
      .query<UserRow>(`SELECT ${userColumns} FROM dbo.Users WHERE Id = @id`);
    const row = result.recordset[0];
    return row ? mapUser(row) : null;
  }

  async insert(
    input: {
      email: string;
      passwordHash: string;
      role: Role;
      campusIdentifier: string;
      firstName: string;
      lastName: string;
      phone: string | null;
    },
    tx: sql.Transaction,
  ): Promise<UserRecord> {
    const result = await requestFor(tx)
      .input("email", sql.NVarChar(255), input.email)
      .input("passwordHash", sql.NVarChar(255), input.passwordHash)
      .input("role", sql.NVarChar(32), input.role)
      .input("campusIdentifier", sql.NVarChar(64), input.campusIdentifier)
      .input("firstName", sql.NVarChar(80), input.firstName)
      .input("lastName", sql.NVarChar(80), input.lastName)
      .input("phone", sql.NVarChar(32), input.phone)
      .query<UserRow>(`
        INSERT INTO dbo.Users (Email, PasswordHash, Role, CampusIdentifier, FirstName, LastName, Phone)
        OUTPUT INSERTED.Id, INSERTED.Email, INSERTED.PasswordHash, INSERTED.Role,
               INSERTED.CampusIdentifier, INSERTED.FirstName, INSERTED.LastName, INSERTED.Phone
        VALUES (@email, @passwordHash, @role, @campusIdentifier, @firstName, @lastName, @phone)
      `);
    return mapUser(result.recordset[0]);
  }

  async updateProfile(id: number, input: { firstName: string; lastName: string; phone: string | null }) {
    const pool = await getPool();
    await pool
      .request()
      .input("id", sql.Int, id)
      .input("firstName", sql.NVarChar(80), input.firstName)
      .input("lastName", sql.NVarChar(80), input.lastName)
      .input("phone", sql.NVarChar(32), input.phone)
      .query(`
        UPDATE dbo.Users
        SET FirstName = @firstName, LastName = @lastName, Phone = @phone
        WHERE Id = @id
      `);
  }

  async updateRole(id: number, role: Role) {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("id", sql.Int, id)
      .input("role", sql.NVarChar(32), role)
      .query(`UPDATE dbo.Users SET Role = @role WHERE Id = @id`);
    return result.rowsAffected[0] > 0;
  }
}

function requestFor(tx: sql.Transaction): sql.Request {
  return new sql.Request(tx);
}
