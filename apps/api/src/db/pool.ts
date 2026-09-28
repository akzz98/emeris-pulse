import sql from "mssql";
import { HttpError } from "../http/httpError.js";

let pool: sql.ConnectionPool | null = null;

// SQL traffic is encrypted. A connection string cannot turn TLS off.
function requireTls(connectionString: string): string {
  if (/encrypt\s*=\s*false/i.test(connectionString)) {
    throw new HttpError(503, "DATABASE_UNAVAILABLE", "The database connection must use TLS.");
  }
  if (/encrypt\s*=\s*true/i.test(connectionString)) {
    return connectionString;
  }
  return `${connectionString};Encrypt=true`;
}

export async function getPool(): Promise<sql.ConnectionPool> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new HttpError(503, "DATABASE_UNAVAILABLE", "Database is not configured.");
  }
  if (pool?.connected) {
    return pool;
  }
  pool = await sql.connect(requireTls(connectionString));
  return pool;
}

export function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("number" in error)) {
    return false;
  }
  const number = (error as { number: number }).number;
  return number === 2627 || number === 2601;
}
