import "dotenv/config";
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";
import { getDatabaseConfig } from "../src/config.js";

const migrationsDirectory = fileURLToPath(new URL("../migrations/", import.meta.url));
const connection = await mysql.createConnection(getDatabaseConfig());

try {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename VARCHAR(255) NOT NULL PRIMARY KEY,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB
  `);

  const [appliedRows] = await connection.query("SELECT filename FROM schema_migrations");
  const applied = new Set(appliedRows.map((row) => row.filename));
  const filenames = (await readdir(migrationsDirectory))
    .filter((filename) => filename.endsWith(".sql"))
    .sort();

  for (const filename of filenames) {
    if (applied.has(filename)) continue;

    const sql = (await readFile(new URL(`../migrations/${filename}`, import.meta.url), "utf8")).trim();
    await connection.query(sql);
    await connection.execute("INSERT INTO schema_migrations (filename) VALUES (?)", [filename]);
    console.log(`Applied migration: ${filename}`);
  }
} finally {
  await connection.end();
}
