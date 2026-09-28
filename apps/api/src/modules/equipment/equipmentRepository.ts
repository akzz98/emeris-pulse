import sql from "mssql";
import { getPool } from "../../db/pool.js";

export type EquipmentStatus = "Available" | "OutOfService";

export type EquipmentItem = {
  id: number;
  code: string;
  name: string;
  location: string;
  status: EquipmentStatus;
};

export type EquipmentSession = {
  id: number;
  equipmentId: number;
  code: string;
  name: string;
  location: string;
  startedAt: string;
};

type EquipmentRow = {
  Id: number;
  Code: string;
  Name: string;
  Location: string;
  Status: EquipmentStatus;
};

type SessionRow = {
  Id: number;
  EquipmentId: number;
  Code: string;
  Name: string;
  Location: string;
  StartedAt: string;
};

function asUtc(value: string | Date): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  return value.endsWith("Z") ? value : `${value}Z`;
}

function mapEquipment(row: EquipmentRow): EquipmentItem {
  return {
    id: row.Id,
    code: row.Code,
    name: row.Name,
    location: row.Location,
    status: row.Status,
  };
}

function mapSession(row: SessionRow): EquipmentSession {
  return {
    id: row.Id,
    equipmentId: row.EquipmentId,
    code: row.Code,
    name: row.Name,
    location: row.Location,
    startedAt: asUtc(row.StartedAt),
  };
}

const sessionColumns = `
  es.Id,
  es.EquipmentId,
  e.Code,
  e.Name,
  e.Location,
  CONVERT(varchar(33), es.StartedAt, 127) AS StartedAt
`;

export class EquipmentRepository {
  async list(): Promise<EquipmentItem[]> {
    const pool = await getPool();
    const result = await pool.request().query<EquipmentRow>(`
      SELECT Id, Code, Name, Location, Status
      FROM dbo.Equipment
      ORDER BY Code
    `);
    return result.recordset.map(mapEquipment);
  }

  async lockByCode(transaction: sql.Transaction, code: string): Promise<EquipmentItem | null> {
    const result = await transaction.request().input("code", sql.NVarChar(32), code).query<EquipmentRow>(`
      SELECT Id, Code, Name, Location, Status
      FROM dbo.Equipment WITH (UPDLOCK, HOLDLOCK)
      WHERE Code = @code
    `);
    const row = result.recordset[0];
    return row ? mapEquipment(row) : null;
  }

  async lockOpenForUser(transaction: sql.Transaction, userId: number): Promise<EquipmentSession | null> {
    const result = await transaction.request().input("userId", sql.Int, userId).query<SessionRow>(`
      SELECT ${sessionColumns}
      FROM dbo.EquipmentSessions es WITH (UPDLOCK, HOLDLOCK)
      INNER JOIN dbo.Equipment e ON e.Id = es.EquipmentId
      WHERE es.UserId = @userId AND es.EndedAt IS NULL
    `);
    const row = result.recordset[0];
    return row ? mapSession(row) : null;
  }

  async lockOpenForEquipment(transaction: sql.Transaction, equipmentId: number): Promise<EquipmentSession | null> {
    const result = await transaction.request().input("equipmentId", sql.Int, equipmentId).query<SessionRow>(`
      SELECT ${sessionColumns}
      FROM dbo.EquipmentSessions es WITH (UPDLOCK, HOLDLOCK)
      INNER JOIN dbo.Equipment e ON e.Id = es.EquipmentId
      WHERE es.EquipmentId = @equipmentId AND es.EndedAt IS NULL
    `);
    const row = result.recordset[0];
    return row ? mapSession(row) : null;
  }

  async insertSession(transaction: sql.Transaction, machine: EquipmentItem, userId: number): Promise<EquipmentSession> {
    const result = await transaction
      .request()
      .input("equipmentId", sql.Int, machine.id)
      .input("userId", sql.Int, userId)
      .query<{ Id: number; StartedAt: string | Date }>(`
        INSERT INTO dbo.EquipmentSessions (EquipmentId, UserId, StartedAt)
        OUTPUT INSERTED.Id, INSERTED.StartedAt
        VALUES (@equipmentId, @userId, SYSUTCDATETIME())
      `);
    const row = result.recordset[0];
    return {
      id: row.Id,
      equipmentId: machine.id,
      code: machine.code,
      name: machine.name,
      location: machine.location,
      startedAt: asUtc(row.StartedAt),
    };
  }

  async openSessionForUser(userId: number): Promise<EquipmentSession | null> {
    const pool = await getPool();
    const result = await pool.request().input("userId", sql.Int, userId).query<SessionRow>(`
      SELECT ${sessionColumns}
      FROM dbo.EquipmentSessions es
      INNER JOIN dbo.Equipment e ON e.Id = es.EquipmentId
      WHERE es.UserId = @userId AND es.EndedAt IS NULL
    `);
    const row = result.recordset[0];
    return row ? mapSession(row) : null;
  }

  async endOpenSession(userId: number): Promise<boolean> {
    const pool = await getPool();
    const result = await pool.request().input("userId", sql.Int, userId).query(`
      UPDATE dbo.EquipmentSessions
      SET EndedAt = SYSUTCDATETIME()
      WHERE UserId = @userId AND EndedAt IS NULL
    `);
    return (result.rowsAffected[0] ?? 0) > 0;
  }
}
