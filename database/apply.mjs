import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sql from "mssql";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const directory = path.dirname(fileURLToPath(import.meta.url));

function batches(text) {
  return text
    .split(/^\s*GO\s*$/gim)
    .map((batch) => batch.trim())
    .filter(Boolean);
}

async function connect() {
  const started = Date.now();
  let lastError = "SQL did not accept a connection.";
  while (Date.now() - started < 120000) {
    try {
      return await sql.connect(connectionString);
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      console.log("Waiting for SQL...");
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
  throw new Error(lastError);
}

const pool = await connect();
try {
  for (const file of ["schema.sql", "seed.sql"]) {
    const text = fs.readFileSync(path.join(directory, file), "utf8");
    for (const batch of batches(text)) {
      await pool.request().query(batch);
    }
    console.log(`Applied ${file}`);
  }
} finally {
  await pool.close();
}
