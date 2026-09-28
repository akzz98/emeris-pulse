import { getPool } from "../../db/pool.js";

function asUtc(value: string | null): string | null {
  if (!value) {
    return null;
  }
  return value.endsWith("Z") ? value : `${value}Z`;
}

export type ClassFillRow = {
  id: number;
  title: string;
  startsAt: string;
  location: string;
  capacity: number;
  filled: number;
};

export type DowntimeRow = {
  id: number;
  code: string;
  name: string;
  location: string;
  status: "Available" | "OutOfService";
  openTickets: number;
  openSince: string | null;
};

export class ReportsRepository {
  // A held seat is Booked, Attended, or Absent. Waitlisted members are not in the room.
  // The booking count uses IX_Bookings_Class_Status.
  async classFill(): Promise<ClassFillRow[]> {
    const pool = await getPool();
    const result = await pool.request().query<{
      Id: number;
      Title: string;
      StartsAt: string;
      Location: string;
      Capacity: number;
      Filled: number;
    }>(`
      SELECT
        cs.Id,
        cs.Title,
        CONVERT(varchar(33), cs.StartsAt, 126) AS StartsAt,
        cs.Location,
        cs.Capacity,
        (
          SELECT COUNT(*)
          FROM dbo.Bookings b
          WHERE b.ClassSessionId = cs.Id
            AND b.Status IN (N'Booked', N'Attended', N'Absent')
        ) AS Filled
      FROM dbo.ClassSessions cs
      WHERE cs.Status <> N'Cancelled'
      ORDER BY cs.StartsAt DESC, cs.Id DESC
    `);
    return result.recordset.map((row) => ({
      id: row.Id,
      title: row.Title,
      startsAt: row.StartsAt,
      location: row.Location,
      capacity: Number(row.Capacity),
      filled: Number(row.Filled),
    }));
  }

  // Current downtime starts at the earliest ticket that is still open.
  async equipmentDowntime(): Promise<DowntimeRow[]> {
    const pool = await getPool();
    const result = await pool.request().query<{
      Id: number;
      Code: string;
      Name: string;
      Location: string;
      Status: "Available" | "OutOfService";
      OpenTickets: number;
      OpenSince: string | null;
    }>(`
      SELECT
        e.Id,
        e.Code,
        e.Name,
        e.Location,
        e.Status,
        (
          SELECT COUNT(*)
          FROM dbo.MaintenanceTickets t
          WHERE t.EquipmentId = e.Id AND t.Status IN (N'Open', N'InProgress')
        ) AS OpenTickets,
        CONVERT(varchar(33), (
          SELECT MIN(t.OpenedAt)
          FROM dbo.MaintenanceTickets t
          WHERE t.EquipmentId = e.Id AND t.Status IN (N'Open', N'InProgress')
        ), 127) AS OpenSince
      FROM dbo.Equipment e
      ORDER BY CASE WHEN e.Status = N'OutOfService' THEN 0 ELSE 1 END, e.Code
    `);
    return result.recordset.map((row) => ({
      id: row.Id,
      code: row.Code,
      name: row.Name,
      location: row.Location,
      status: row.Status,
      openTickets: Number(row.OpenTickets),
      openSince: asUtc(row.OpenSince),
    }));
  }
}
