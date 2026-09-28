import sql from "mssql";
import { HttpError } from "../http/httpError.js";

let pool: sql.ConnectionPool | null = null;

export async function getPool(): Promise<sql.ConnectionPool> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new HttpError(503, "DATABASE_UNAVAILABLE", "Database is not configured.");
  }
  if (pool?.connected) {
    return pool;
  }
  pool = await sql.connect(connectionString);
  return pool;
}

export function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("number" in error)) {
    return false;
  }
  const number = (error as { number: number }).number;
  return number === 2627 || number === 2601;
}
