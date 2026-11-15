import "dotenv/config";
import mysql from "mysql2/promise";
import { getAdminSeed, getDatabaseConfig } from "../src/config.js";
import { hashPassword } from "../src/auth/password.js";

const { ADMIN_ID, ADMIN_PASSWORD } = getAdminSeed();
const passwordHash = await hashPassword(ADMIN_PASSWORD);
const connection = await mysql.createConnection(getDatabaseConfig());

try {
  await connection.execute(
    `INSERT INTO admin_users (id, password_hash)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE id = VALUES(id)`,
    [ADMIN_ID, passwordHash]
  );
  console.log(`Admin "${ADMIN_ID}" is ready.`);
} finally {
  await connection.end();
}
