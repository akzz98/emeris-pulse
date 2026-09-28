import sql from "mssql";
import type { EquipmentStatus } from "../../domain/equipment.js";
import type { TicketStatus } from "../../domain/maintenance.js";
import { getPool } from "../../db/pool.js";

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

export type OpenTicket = {
  id: number;
  status: TicketStatus;
  description: string;
  openedAt: string;
  equipmentId: number;
  code: string;
  name: string;
  location: string;
  equipmentStatus: EquipmentStatus;
  reportedBy: string;
};

type OpenTicketRow = {
  Id: number;
  Status: TicketStatus;
  Description: string;
  OpenedAt: string | Date;
  EquipmentId: number;
  Code: string;
  Name: string;
  Location: string;
  EquipmentStatus: EquipmentStatus;
  FirstName: string;
  LastName: string;
};

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

  // Studio kit is equipment whose location name starts with Studio.
  async listInStudio(): Promise<EquipmentItem[]> {
    const pool = await getPool();
    const result = await pool.request().query<EquipmentRow>(`
      SELECT Id, Code, Name, Location, Status
      FROM dbo.Equipment
      WHERE Location LIKE N'Studio%'
      ORDER BY Code
    `);
    return result.recordset.map(mapEquipment);
  }

  async lockById(transaction: sql.Transaction, equipmentId: number): Promise<EquipmentItem | null> {
    const result = await transaction.request().input("equipmentId", sql.Int, equipmentId).query<EquipmentRow>(`
      SELECT Id, Code, Name, Location, Status
      FROM dbo.Equipment WITH (UPDLOCK, HOLDLOCK)
      WHERE Id = @equipmentId
    `);
    const row = result.recordset[0];
    return row ? mapEquipment(row) : null;
  }

  async setStatus(transaction: sql.Transaction, equipmentId: number, status: EquipmentStatus): Promise<void> {
    await transaction
      .request()
      .input("equipmentId", sql.Int, equipmentId)
      .input("status", sql.NVarChar(16), status)
      .query(`
        UPDATE dbo.Equipment
        SET Status = @status
        WHERE Id = @equipmentId
      `);
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

  async lockOpenTicket(transaction: sql.Transaction, equipmentId: number): Promise<boolean> {
    const result = await transaction.request().input("equipmentId", sql.Int, equipmentId).query<{ Id: number }>(`
      SELECT TOP 1 Id
      FROM dbo.MaintenanceTickets WITH (UPDLOCK, HOLDLOCK)
      WHERE EquipmentId = @equipmentId AND Status IN (N'Open', N'InProgress')
    `);
    return result.recordset.length > 0;
  }

  async listOpenTickets(): Promise<OpenTicket[]> {
    const pool = await getPool();
    const result = await pool.request().query<OpenTicketRow>(`
      SELECT
        t.Id,
        t.Status,
        t.Description,
        CONVERT(varchar(33), t.OpenedAt, 127) AS OpenedAt,
        e.Id AS EquipmentId,
        e.Code,
        e.Name,
        e.Location,
        e.Status AS EquipmentStatus,
        u.FirstName,
        u.LastName
      FROM dbo.MaintenanceTickets t
      INNER JOIN dbo.Equipment e ON e.Id = t.EquipmentId
      INNER JOIN dbo.Users u ON u.Id = t.ReportedByUserId
      WHERE t.Status IN (N'Open', N'InProgress')
      ORDER BY t.OpenedAt, t.Id
    `);
    return result.recordset.map((row) => ({
      id: row.Id,
      status: row.Status,
      description: row.Description,
      openedAt: asUtc(row.OpenedAt),
      equipmentId: row.EquipmentId,
      code: row.Code,
      name: row.Name,
      location: row.Location,
      equipmentStatus: row.EquipmentStatus,
      reportedBy: `${row.FirstName} ${row.LastName}`,
    }));
  }

  async openTicketForEquipment(equipmentId: number): Promise<boolean> {
    const pool = await getPool();
    const result = await pool.request().input("equipmentId", sql.Int, equipmentId).query<{ Id: number }>(`
      SELECT TOP 1 Id
      FROM dbo.MaintenanceTickets
      WHERE EquipmentId = @equipmentId AND Status IN (N'Open', N'InProgress')
    `);
    return result.recordset.length > 0;
  }

  async insertTicket(
    equipmentId: number,
    userId: number,
    description: string,
    status: TicketStatus,
    transaction?: sql.Transaction,
  ): Promise<{ id: number }> {
    const request = transaction ? transaction.request() : (await getPool()).request();
    const result = await request
      .input("equipmentId", sql.Int, equipmentId)
      .input("userId", sql.Int, userId)
      .input("status", sql.NVarChar(16), status)
      .input("description", sql.NVarChar(400), description)
      .query<{ Id: number }>(`
        INSERT INTO dbo.MaintenanceTickets (EquipmentId, ReportedByUserId, Status, Description)
        OUTPUT INSERTED.Id
        VALUES (@equipmentId, @userId, @status, @description)
      `);
    return { id: result.recordset[0].Id };
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
