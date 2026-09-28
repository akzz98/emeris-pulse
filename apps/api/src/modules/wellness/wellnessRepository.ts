import sql from "mssql";
import { getPool } from "../../db/pool.js";

export type OpenChallenge = {
  id: number;
  title: string;
  description: string;
  startsOn: string;
  endsOn: string;
  joined: boolean;
};

type ChallengeRow = {
  Id: number;
  Title: string;
  Description: string;
  StartsOn: string;
  EndsOn: string;
  Joined: number;
};

type LockedChallengeRow = {
  Id: number;
  Title: string;
  OpenNow: number;
};

export type ChallengePhase = "Open" | "Upcoming" | "Ended";

export type ManagedChallenge = {
  id: number;
  title: string;
  description: string;
  startsOn: string;
  endsOn: string;
  phase: ChallengePhase;
  joinedCount: number;
};

type ManagedChallengeRow = {
  Id: number;
  Title: string;
  Description: string;
  StartsOn: string;
  EndsOn: string;
  Phase: ChallengePhase;
  JoinedCount: number;
};

function mapChallenge(row: ChallengeRow): OpenChallenge {
  return {
    id: row.Id,
    title: row.Title,
    description: row.Description,
    startsOn: row.StartsOn,
    endsOn: row.EndsOn,
    joined: Number(row.Joined) === 1,
  };
}

export class WellnessRepository {
  async listOpen(userId: number): Promise<OpenChallenge[]> {
    const pool = await getPool();
    const result = await pool.request().input("userId", sql.Int, userId).query<ChallengeRow>(`
      SELECT
        c.Id,
        c.Title,
        c.Description,
        CONVERT(char(10), c.StartsOn, 23) AS StartsOn,
        CONVERT(char(10), c.EndsOn, 23) AS EndsOn,
        CASE WHEN ce.Id IS NULL THEN 0 ELSE 1 END AS Joined
      FROM dbo.Challenges c
      LEFT JOIN dbo.ChallengeEnrolments ce
        ON ce.ChallengeId = c.Id AND ce.UserId = @userId
      WHERE c.StartsOn <= CAST(GETDATE() AS DATE)
        AND c.EndsOn >= CAST(GETDATE() AS DATE)
      ORDER BY c.StartsOn, c.Id
    `);
    return result.recordset.map(mapChallenge);
  }

  async lockChallenge(
    transaction: sql.Transaction,
    challengeId: number,
  ): Promise<{ id: number; title: string; openNow: boolean } | null> {
    const result = await transaction.request().input("challengeId", sql.Int, challengeId).query<LockedChallengeRow>(`
      SELECT
        Id,
        Title,
        CASE
          WHEN StartsOn <= CAST(GETDATE() AS DATE) AND EndsOn >= CAST(GETDATE() AS DATE) THEN 1
          ELSE 0
        END AS OpenNow
      FROM dbo.Challenges WITH (UPDLOCK, HOLDLOCK)
      WHERE Id = @challengeId
    `);
    const row = result.recordset[0];
    return row ? { id: row.Id, title: row.Title, openNow: Number(row.OpenNow) === 1 } : null;
  }

  async alreadyJoined(transaction: sql.Transaction, challengeId: number, userId: number): Promise<boolean> {
    const result = await transaction
      .request()
      .input("challengeId", sql.Int, challengeId)
      .input("userId", sql.Int, userId)
      .query<{ Id: number }>(`
        SELECT Id
        FROM dbo.ChallengeEnrolments WITH (UPDLOCK, HOLDLOCK)
        WHERE ChallengeId = @challengeId AND UserId = @userId
      `);
    return result.recordset.length > 0;
  }

  async listManaged(): Promise<ManagedChallenge[]> {
    const pool = await getPool();
    const result = await pool.request().query<ManagedChallengeRow>(`
      SELECT
        c.Id,
        c.Title,
        c.Description,
        CONVERT(char(10), c.StartsOn, 23) AS StartsOn,
        CONVERT(char(10), c.EndsOn, 23) AS EndsOn,
        CASE
          WHEN c.EndsOn < CAST(GETDATE() AS DATE) THEN N'Ended'
          WHEN c.StartsOn > CAST(GETDATE() AS DATE) THEN N'Upcoming'
          ELSE N'Open'
        END AS Phase,
        (SELECT COUNT(*) FROM dbo.ChallengeEnrolments ce WHERE ce.ChallengeId = c.Id) AS JoinedCount
      FROM dbo.Challenges c
      ORDER BY c.StartsOn DESC, c.Id DESC
    `);
    return result.recordset.map((row) => ({
      id: row.Id,
      title: row.Title,
      description: row.Description,
      startsOn: row.StartsOn,
      endsOn: row.EndsOn,
      phase: row.Phase,
      joinedCount: Number(row.JoinedCount),
    }));
  }

  async insertChallenge(
    userId: number,
    input: { title: string; description: string; startsOn: string; endsOn: string },
  ): Promise<{ id: number }> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("title", sql.NVarChar(120), input.title)
      .input("description", sql.NVarChar(400), input.description)
      .input("startsOn", sql.NVarChar(10), input.startsOn)
      .input("endsOn", sql.NVarChar(10), input.endsOn)
      .input("userId", sql.Int, userId)
      .query<{ Id: number }>(`
        INSERT INTO dbo.Challenges (Title, Description, StartsOn, EndsOn, CreatedByUserId)
        OUTPUT INSERTED.Id
        VALUES (@title, @description, CAST(@startsOn AS DATE), CAST(@endsOn AS DATE), @userId)
      `);
    return { id: result.recordset[0].Id };
  }

  async insertEnrolment(transaction: sql.Transaction, challengeId: number, userId: number): Promise<void> {
    await transaction
      .request()
      .input("challengeId", sql.Int, challengeId)
      .input("userId", sql.Int, userId)
      .query(`
        INSERT INTO dbo.ChallengeEnrolments (ChallengeId, UserId)
        VALUES (@challengeId, @userId)
      `);
  }
}
