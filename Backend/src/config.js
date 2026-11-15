import "dotenv/config";
import { z } from "zod";

const databaseSchema = z.object({
  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().int().min(1).max(65535).default(3306),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string(),
  DB_NAME: z.string().min(1)
});

export function getDatabaseConfig() {
  const config = databaseSchema.parse(process.env);

  return {
    host: config.DB_HOST,
    port: config.DB_PORT,
    user: config.DB_USER,
    password: config.DB_PASSWORD,
    database: config.DB_NAME
  };
}

export function getJwtSecret() {
  return z.string().min(32).parse(process.env.JWT_SECRET);
}

export function getAdminSeed() {
  return z.object({
    ADMIN_ID: z.string().min(1).max(64),
    ADMIN_PASSWORD: z.string().min(12)
  }).parse(process.env);
}

export function getCloudinaryConfig() {
  return z.object({
    CLOUDINARY_CLOUD_NAME: z.string().min(1),
    CLOUDINARY_API_KEY: z.string().min(1),
    CLOUDINARY_API_SECRET: z.string().min(1)
  }).parse(process.env);
}

export function getPort() {
  return z.coerce.number().int().min(1).max(65535).default(3000).parse(process.env.PORT);
}
