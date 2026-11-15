import mysql from "mysql2/promise";
import { getDatabaseConfig } from "./config.js";

export const pool = mysql.createPool({
  ...getDatabaseConfig(),
  waitForConnections: true,
  connectionLimit: 10
});
