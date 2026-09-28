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
  ended: boolean;
  instructorId: number;
  title: string;
  location: string;
  startsAt: string;
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
      Ended: number;
      InstructorUserId: number;
      Title: string;
      Location: string;
      StartsAt: string;
    }>(`
      SELECT
        Id,
        Capacity,
        Status,
        CASE WHEN StartsAt <= CAST(GETDATE() AS DATETIME2) THEN 1 ELSE 0 END AS Started,
        CASE WHEN EndsAt <= CAST(GETDATE() AS DATETIME2) THEN 1 ELSE 0 END AS Ended,
        InstructorUserId,
        Title,
        Location,
        CONVERT(varchar(33), StartsAt, 126) AS StartsAt
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
      ended: Number(row.Ended) === 1,
      instructorId: row.InstructorUserId,
      title: row.Title,
      location: row.Location,
      startsAt: row.StartsAt,
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

  async insertPlace(
    transaction: sql.Transaction,
    classId: number,
    userId: number,
    status: "Booked" | "Waitlisted",
  ): Promise<void> {
    await new sql.Request(transaction)
      .input("classId", sql.Int, classId)
      .input("userId", sql.Int, userId)
      .input("status", sql.NVarChar(16), status)
      .query(`
        INSERT INTO dbo.Bookings (ClassSessionId, UserId, Status)
        VALUES (@classId, @userId, @status)
      `);
  }

  // Earliest waitlist row wins the freed seat. CreatedAt then Id keeps the order stable.
  async nextWaitlisted(
    transaction: sql.Transaction,
    classId: number,
  ): Promise<{ id: number; firstName: string; lastName: string } | null> {
    const result = await new sql.Request(transaction).input("classId", sql.Int, classId).query<{
      Id: number;
      FirstName: string;
      LastName: string;
    }>(`
      SELECT TOP 1 b.Id, u.FirstName, u.LastName
      FROM dbo.Bookings b WITH (UPDLOCK, ROWLOCK)
      INNER JOIN dbo.Users u ON u.Id = b.UserId
      WHERE b.ClassSessionId = @classId AND b.Status = N'Waitlisted'
      ORDER BY b.CreatedAt, b.Id
    `);
    const row = result.recordset[0];
    return row ? { id: row.Id, firstName: row.FirstName, lastName: row.LastName } : null;
  }

  async setStatus(transaction: sql.Transaction, bookingId: number, status: PlaceStatus): Promise<void> {
    await new sql.Request(transaction)
      .input("bookingId", sql.Int, bookingId)
      .input("status", sql.NVarChar(16), status)
      .query(`UPDATE dbo.Bookings SET Status = @status WHERE Id = @bookingId`);
  }

  // People with a booked place. Waitlisted members are not expected in the room yet.
  async rosterForInstructor(instructorId: number): Promise<{
    date: string;
    classes: Array<{
      id: number;
      title: string;
      startsAt: string;
      endsAt: string;
      location: string;
      members: Array<{ firstName: string; lastName: string; email: string }>;
    }>;
  }> {
    const pool = await getPool();
    const request = pool.request().input("instructorId", sql.Int, instructorId);
    const classes = await request.query<{
      Id: number;
      Title: string;
      StartsAt: string;
      EndsAt: string;
      Location: string;
      SessionDate: string;
    }>(`
      SELECT
        cs.Id,
        cs.Title,
        CONVERT(varchar(33), cs.StartsAt, 126) AS StartsAt,
        CONVERT(varchar(33), cs.EndsAt, 126) AS EndsAt,
        cs.Location,
        CONVERT(varchar(10), CAST(GETDATE() AS DATE), 23) AS SessionDate
      FROM dbo.ClassSessions cs
      WHERE cs.InstructorUserId = @instructorId
        AND CAST(cs.StartsAt AS DATE) = CAST(GETDATE() AS DATE)
        AND cs.Status = N'Scheduled'
      ORDER BY cs.StartsAt, cs.Id
    `);
    const members = await pool.request().input("instructorId", sql.Int, instructorId).query<{
      ClassSessionId: number;
      FirstName: string;
      LastName: string;
      Email: string;
    }>(`
      SELECT b.ClassSessionId, u.FirstName, u.LastName, u.Email
      FROM dbo.Bookings b
      INNER JOIN dbo.Users u ON u.Id = b.UserId
      INNER JOIN dbo.ClassSessions cs ON cs.Id = b.ClassSessionId
      WHERE cs.InstructorUserId = @instructorId
        AND CAST(cs.StartsAt AS DATE) = CAST(GETDATE() AS DATE)
        AND cs.Status = N'Scheduled'
        AND b.Status = N'Booked'
      ORDER BY u.LastName, u.FirstName
    `);
    const dateRow = await pool.request().query<{ SessionDate: string }>(`
      SELECT CONVERT(varchar(10), CAST(GETDATE() AS DATE), 23) AS SessionDate
    `);
    return {
      date: dateRow.recordset[0]?.SessionDate ?? "",
      classes: classes.recordset.map((row) => ({
        id: row.Id,
        title: row.Title,
        startsAt: row.StartsAt,
        endsAt: row.EndsAt,
        location: row.Location,
        members: members.recordset
          .filter((member) => member.ClassSessionId === row.Id)
          .map((member) => ({
            firstName: member.FirstName,
            lastName: member.LastName,
            email: member.Email,
          })),
      })),
    };
  }

  async attendanceForInstructor(instructorId: number) {
    const pool = await getPool();
    const classes = await pool.request().input("instructorId", sql.Int, instructorId).query<{
      Id: number;
      Title: string;
      StartsAt: string;
      Location: string;
    }>(`
      SELECT
        Id,
        Title,
        CONVERT(varchar(33), StartsAt, 126) AS StartsAt,
        Location
      FROM dbo.ClassSessions
      WHERE InstructorUserId = @instructorId
        AND Status = N'Scheduled'
        AND StartsAt <= CAST(GETDATE() AS DATETIME2)
      ORDER BY StartsAt DESC, Id DESC
    `);
    const members = await pool.request().input("instructorId", sql.Int, instructorId).query<{
      ClassSessionId: number;
      UserId: number;
      FirstName: string;
      LastName: string;
      Status: PlaceStatus;
    }>(`
      SELECT b.ClassSessionId, b.UserId, u.FirstName, u.LastName, b.Status
      FROM dbo.Bookings b
      INNER JOIN dbo.Users u ON u.Id = b.UserId
      INNER JOIN dbo.ClassSessions cs ON cs.Id = b.ClassSessionId
      WHERE cs.InstructorUserId = @instructorId
        AND cs.Status = N'Scheduled'
        AND cs.StartsAt <= CAST(GETDATE() AS DATETIME2)
        AND b.Status IN (N'Booked', N'Attended', N'Absent')
      ORDER BY u.LastName, u.FirstName
    `);
    return classes.recordset.map((row) => ({
      id: row.Id,
      title: row.Title,
      startsAt: row.StartsAt,
      location: row.Location,
      members: members.recordset
        .filter((member) => member.ClassSessionId === row.Id)
        .map((member) => ({
          userId: member.UserId,
          firstName: member.FirstName,
          lastName: member.LastName,
          status: member.Status,
        })),
    }));
  }

  async trendsForInstructor(instructorId: number) {
    const pool = await getPool();
    const result = await pool.request().input("instructorId", sql.Int, instructorId).query<{
      Id: number;
      Title: string;
      StartsAt: string;
      Attended: number;
      Absent: number;
    }>(`
      SELECT
        cs.Id,
        cs.Title,
        CONVERT(varchar(33), cs.StartsAt, 126) AS StartsAt,
        SUM(CASE WHEN b.Status = N'Attended' THEN 1 ELSE 0 END) AS Attended,
        SUM(CASE WHEN b.Status = N'Absent' THEN 1 ELSE 0 END) AS Absent
      FROM dbo.ClassSessions cs
      INNER JOIN dbo.Bookings b
        ON b.ClassSessionId = cs.Id AND b.Status IN (N'Attended', N'Absent')
      WHERE cs.InstructorUserId = @instructorId
      GROUP BY cs.Id, cs.Title, cs.StartsAt
      ORDER BY cs.StartsAt DESC
    `);
    return result.recordset.map((row) => ({
      id: row.Id,
      title: row.Title,
      startsAt: row.StartsAt,
      attended: Number(row.Attended),
      absent: Number(row.Absent),
    }));
  }

  async scheduledForInstructor(instructorId: number) {
    const pool = await getPool();
    const result = await pool.request().input("instructorId", sql.Int, instructorId).query<{
      Id: number;
      Title: string;
      StartsAt: string;
      EndsAt: string;
      Location: string;
      Capacity: number;
      BookedCount: number;
    }>(`
      SELECT
        cs.Id,
        cs.Title,
        CONVERT(varchar(33), cs.StartsAt, 126) AS StartsAt,
        CONVERT(varchar(33), cs.EndsAt, 126) AS EndsAt,
        cs.Location,
        cs.Capacity,
        (
          SELECT COUNT(*)
          FROM dbo.Bookings b
          WHERE b.ClassSessionId = cs.Id AND b.Status IN (N'Booked', N'Waitlisted')
        ) AS BookedCount
      FROM dbo.ClassSessions cs
      WHERE cs.InstructorUserId = @instructorId
        AND cs.Status = N'Scheduled'
        AND cs.EndsAt > CAST(GETDATE() AS DATETIME2)
      ORDER BY cs.StartsAt, cs.Id
    `);
    return result.recordset.map((row) => ({
      id: row.Id,
      title: row.Title,
      startsAt: row.StartsAt,
      endsAt: row.EndsAt,
      location: row.Location,
      capacity: Number(row.Capacity),
      placesHeld: Number(row.BookedCount),
    }));
  }

  async peopleToNotify(transaction: sql.Transaction, classId: number): Promise<number[]> {
    const result = await new sql.Request(transaction).input("classId", sql.Int, classId).query<{ UserId: number }>(`
      SELECT UserId
      FROM dbo.Bookings
      WHERE ClassSessionId = @classId AND Status IN (N'Booked', N'Waitlisted')
    `);
    return result.recordset.map((row) => row.UserId);
  }

  async insertNotification(transaction: sql.Transaction, userId: number, title: string, body: string): Promise<void> {
    await new sql.Request(transaction)
      .input("userId", sql.Int, userId)
      .input("title", sql.NVarChar(160), title)
      .input("body", sql.NVarChar(600), body)
      .query(`
        INSERT INTO dbo.Notifications (UserId, Title, Body)
        VALUES (@userId, @title, @body)
      `);
  }

  async setClassStatus(transaction: sql.Transaction, classId: number, status: ClassStatus): Promise<void> {
    await new sql.Request(transaction)
      .input("classId", sql.Int, classId)
      .input("status", sql.NVarChar(16), status)
      .query(`UPDATE dbo.ClassSessions SET Status = @status WHERE Id = @classId`);
  }

  async listManaged() {
    const pool = await getPool();
    const result = await pool.request().query<{
      Id: number;
      Title: string;
      InstructorEmail: string;
      InstructorName: string;
      StartsAt: string;
      EndsAt: string;
      Location: string;
      Capacity: number;
      BookedCount: number;
      Status: ClassStatus;
    }>(`
      SELECT
        cs.Id,
        cs.Title,
        instructor.Email AS InstructorEmail,
        instructor.FirstName + N' ' + instructor.LastName AS InstructorName,
        CONVERT(varchar(33), cs.StartsAt, 126) AS StartsAt,
        CONVERT(varchar(33), cs.EndsAt, 126) AS EndsAt,
        cs.Location,
        cs.Capacity,
        cs.Status,
        (
          SELECT COUNT(*)
          FROM dbo.Bookings b
          WHERE b.ClassSessionId = cs.Id AND b.Status = N'Booked'
        ) AS BookedCount
      FROM dbo.ClassSessions cs
      INNER JOIN dbo.Users instructor ON instructor.Id = cs.InstructorUserId
      WHERE cs.Status = N'Scheduled'
      ORDER BY cs.StartsAt, cs.Id
    `);
    return result.recordset.map((row) => ({
      id: row.Id,
      title: row.Title,
      instructorEmail: row.InstructorEmail,
      instructorName: row.InstructorName,
      startsAt: row.StartsAt,
      endsAt: row.EndsAt,
      location: row.Location,
      capacity: Number(row.Capacity),
      bookedCount: Number(row.BookedCount),
      status: row.Status,
    }));
  }

  async listInstructors() {
    const pool = await getPool();
    const result = await pool.request().query<{
      Id: number;
      Email: string;
      FirstName: string;
      LastName: string;
    }>(`
      SELECT Id, Email, FirstName, LastName
      FROM dbo.Users
      WHERE Role = N'Instructor'
      ORDER BY LastName, FirstName
    `);
    return result.recordset.map((row) => ({
      id: row.Id,
      email: row.Email,
      firstName: row.FirstName,
      lastName: row.LastName,
    }));
  }

  async findInstructorByEmail(email: string): Promise<{ id: number } | null> {
    const pool = await getPool();
    const result = await pool.request().input("email", sql.NVarChar(255), email).query<{ Id: number }>(`
      SELECT Id
      FROM dbo.Users
      WHERE Email = @email AND Role = N'Instructor'
    `);
    const row = result.recordset[0];
    return row ? { id: row.Id } : null;
  }

  async insertClass(
    input: {
      title: string;
      instructorId: number;
      startsAt: string;
      endsAt: string;
      capacity: number;
      location: string;
    },
  ): Promise<number> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("title", sql.NVarChar(120), input.title)
      .input("instructorId", sql.Int, input.instructorId)
      .input("startsAt", sql.NVarChar(33), input.startsAt)
      .input("endsAt", sql.NVarChar(33), input.endsAt)
      .input("capacity", sql.Int, input.capacity)
      .input("location", sql.NVarChar(80), input.location)
      .query<{ Id: number }>(`
        INSERT INTO dbo.ClassSessions (Title, InstructorUserId, StartsAt, EndsAt, Capacity, Status, Location)
        OUTPUT INSERTED.Id
        VALUES (@title, @instructorId, CAST(@startsAt AS DATETIME2), CAST(@endsAt AS DATETIME2), @capacity, N'Scheduled', @location)
      `);
    return Number(result.recordset[0]?.Id);
  }

  async updateClass(
    transaction: sql.Transaction,
    classId: number,
    input: {
      title: string;
      instructorId: number;
      startsAt: string;
      endsAt: string;
      capacity: number;
      location: string;
    },
  ): Promise<void> {
    await new sql.Request(transaction)
      .input("classId", sql.Int, classId)
      .input("title", sql.NVarChar(120), input.title)
      .input("instructorId", sql.Int, input.instructorId)
      .input("startsAt", sql.NVarChar(33), input.startsAt)
      .input("endsAt", sql.NVarChar(33), input.endsAt)
      .input("capacity", sql.Int, input.capacity)
      .input("location", sql.NVarChar(80), input.location)
      .query(`
        UPDATE dbo.ClassSessions
        SET Title = @title,
            InstructorUserId = @instructorId,
            StartsAt = CAST(@startsAt AS DATETIME2),
            EndsAt = CAST(@endsAt AS DATETIME2),
            Capacity = @capacity,
            Location = @location
        WHERE Id = @classId
      `);
  }
}
