import { createApp } from "./app.js";
import { getCloudinaryConfig, getJwtSecret, getPort } from "./config.js";
import { createCloudinaryService } from "./services/cloudinary.js";
import { pool } from "./db.js";

const app = createApp({
  pool,
  jwtSecret: getJwtSecret(),
  cloudinary: createCloudinaryService(getCloudinaryConfig())
});
const server = app.listen(getPort(), () => {
  console.log(`Backend listening on port ${getPort()}`);
});

function shutdown() {
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
