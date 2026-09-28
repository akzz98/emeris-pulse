import sql from "mssql";
import { getPool } from "../../db/pool.js";

export type ClassStatus = "Scheduled" | "Cancelled" | "Completed";
export type PlaceStatus = "Booked" | "Waitlisted" | "Cancelled" | "Attended" | "Absent";

export type TimetableClass = {
  id: number;
  title: string;
  instructorName: string;
  startsAt: string;
  endsAt: string;
  location: string;
  capacity: number;
  bookedCount: number;
  status: ClassStatus;
  myStatus: "Booked" | "Waitlisted" | null;
};

type TimetableRow = {
  Id: number;
  Title: string;
  InstructorFirstName: string;
  InstructorLastName: string;
  StartsAt: string;
  EndsAt: string;
  Location: string;
  Capacity: number;
  Status: ClassStatus;
  BookedCount: number;
  MyStatus: "Booked" | "Waitlisted" | null;
};

export type LockedClass = {
  id: number;
  capacity: number;
  status: ClassStatus;
  started: boolean;
};

export type ExistingPlace = {
  id: number;
  status: PlaceStatus;
};

export class ClassRepository {
  async upcoming(userId: number): Promise<TimetableClass[]> {
    const pool = await getPool();
    const result = await pool.request().input("userId", sql.Int, userId).query<TimetableRow>(`
      SELECT
        cs.Id,
        cs.Title,
        instructor.FirstName AS InstructorFirstName,
        instructor.LastName AS InstructorLastName,
        CONVERT(varchar(33), cs.StartsAt, 126) AS StartsAt,
        CONVERT(varchar(33), cs.EndsAt, 126) AS EndsAt,
        cs.Location,
        cs.Capacity,
        cs.Status,
        (
          SELECT COUNT(*)
          FROM dbo.Bookings booked
          WHERE booked.ClassSessionId = cs.Id AND booked.Status = N'Booked'
        ) AS BookedCount,
        mine.Status AS MyStatus
      FROM dbo.ClassSessions cs
      INNER JOIN dbo.Users instructor ON instructor.Id = cs.InstructorUserId
      LEFT JOIN dbo.Bookings mine
        ON mine.ClassSessionId = cs.Id
        AND mine.UserId = @userId
        AND mine.Status IN (N'Booked', N'Waitlisted')
      WHERE cs.StartsAt >= CAST(GETDATE() AS DATETIME2)
        AND cs.Status IN (N'Scheduled', N'Cancelled')
      ORDER BY cs.StartsAt, cs.Id
    `);
    return result.recordset.map((row) => ({
      id: row.Id,
      title: row.Title,
      instructorName: `${row.InstructorFirstName} ${row.InstructorLastName}`,
      startsAt: row.StartsAt,
      endsAt: row.EndsAt,
      location: row.Location,
      capacity: Number(row.Capacity),
      bookedCount: Number(row.BookedCount),
      status: row.Status,
      myStatus: row.MyStatus,
    }));
  }

  async lockClass(transaction: sql.Transaction, classId: number): Promise<LockedClass | null> {
    const result = await new sql.Request(transaction).input("classId", sql.Int, classId).query<{
      Id: number;
      Capacity: number;
      Status: ClassStatus;
      Started: number;
    }>(`
      SELECT
        Id,
        Capacity,
        Status,
        CASE WHEN StartsAt <= CAST(GETDATE() AS DATETIME2) THEN 1 ELSE 0 END AS Started
      FROM dbo.ClassSessions WITH (UPDLOCK, ROWLOCK)
      WHERE Id = @classId
    `);
    const row = result.recordset[0];
    if (!row) {
      return null;
    }
    return {
      id: row.Id,
      capacity: Number(row.Capacity),
      status: row.Status,
      started: Number(row.Started) === 1,
    };
  }

  async lockPlace(transaction: sql.Transaction, classId: number, userId: number): Promise<ExistingPlace | null> {
    const result = await new sql.Request(transaction)
      .input("classId", sql.Int, classId)
      .input("userId", sql.Int, userId)
      .query<{ Id: number; Status: PlaceStatus }>(`
        SELECT Id, Status
        FROM dbo.Bookings WITH (UPDLOCK, ROWLOCK)
        WHERE ClassSessionId = @classId AND UserId = @userId
      `);
    const row = result.recordset[0];
    return row ? { id: row.Id, status: row.Status } : null;
  }

  // Hold the booked rows so two members cannot take the last seat together.
  async countBooked(transaction: sql.Transaction, classId: number): Promise<number> {
    const result = await new sql.Request(transaction).input("classId", sql.Int, classId).query<{ BookedCount: number }>(`
      SELECT COUNT(*) AS BookedCount
      FROM dbo.Bookings WITH (UPDLOCK, HOLDLOCK)
      WHERE ClassSessionId = @classId AND Status = N'Booked'
    `);
    return Number(result.recordset[0]?.BookedCount ?? 0);
  }

  async insertBooked(transaction: sql.Transaction, classId: number, userId: number): Promise<void> {
    await new sql.Request(transaction)
      .input("classId", sql.Int, classId)
      .input("userId", sql.Int, userId)
      .query(`
        INSERT INTO dbo.Bookings (ClassSessionId, UserId, Status)
        VALUES (@classId, @userId, N'Booked')
      `);
  }

  async setStatus(transaction: sql.Transaction, bookingId: number, status: PlaceStatus): Promise<void> {
    await new sql.Request(transaction)
      .input("bookingId", sql.Int, bookingId)
      .input("status", sql.NVarChar(16), status)
      .query(`UPDATE dbo.Bookings SET Status = @status WHERE Id = @bookingId`);
  }

  async findPlace(classId: number, userId: number): Promise<(ExistingPlace & { started: boolean }) | null> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("classId", sql.Int, classId)
      .input("userId", sql.Int, userId)
      .query<{ Id: number; Status: PlaceStatus; Started: number }>(`
        SELECT
          b.Id,
          b.Status,
          CASE WHEN cs.StartsAt <= CAST(GETDATE() AS DATETIME2) THEN 1 ELSE 0 END AS Started
        FROM dbo.Bookings b
        INNER JOIN dbo.ClassSessions cs ON cs.Id = b.ClassSessionId
        WHERE b.ClassSessionId = @classId AND b.UserId = @userId
      `);
    const row = result.recordset[0];
    if (!row) {
      return null;
    }
    return { id: row.Id, status: row.Status, started: Number(row.Started) === 1 };
  }
}
