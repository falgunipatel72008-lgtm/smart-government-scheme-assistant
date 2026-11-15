import { Router } from "express";
import rateLimit from "express-rate-limit";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { verifyPassword } from "../auth/password.js";
import { requireAdmin } from "../middleware/requireAdmin.js";

const loginSchema = z.object({
  id: z.string().min(1).max(64),
  password: z.string().min(1)
}).strict();

export function createAuthRouter({ pool, jwtSecret }) {
  const router = Router();
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-7",
    legacyHeaders: false
  });

  router.post("/auth/login", loginLimiter, async (req, res) => {
    const input = loginSchema.safeParse(req.body);
    if (!input.success) {
      return res.status(400).json({ error: "A valid admin ID and password are required" });
    }

    const [admins] = await pool.execute(
      "SELECT id, password_hash FROM admin_users WHERE id = ? LIMIT 1",
      [input.data.id]
    );
    const admin = admins[0];

    if (!admin || !(await verifyPassword(input.data.password, admin.password_hash))) {
      return res.status(401).json({ error: "Invalid admin ID or password" });
    }

    const token = jwt.sign({}, jwtSecret, {
      algorithm: "HS256",
      subject: admin.id,
      expiresIn: "1h"
    });

    return res.json({ token, admin: { id: admin.id } });
  });

  router.get("/admin/me", requireAdmin(jwtSecret), (req, res) => {
    res.json({ admin: req.admin });
  });

  return router;
}
