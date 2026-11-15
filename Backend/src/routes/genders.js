import { Router } from "express";
import { z } from "zod";
import { requireAdmin } from "../middleware/requireAdmin.js";

const isActiveSchema = z.union([
  z.boolean(),
  z.enum(["true", "false"]).transform((value) => value === "true")
]).optional();

const createGenderSchema = z.object({
  gender: z.string().trim().min(1).max(50),
  isActive: isActiveSchema
}).strict();

const updateGenderSchema = z.object({
  gender: z.string().trim().min(1).max(50).optional(),
  isActive: isActiveSchema
}).strict();

const genderIdSchema = z.string()
  .regex(/^[1-9]\d{0,9}$/)
  .refine((value) => Number(value) <= 4294967295);

function toGender(row) {
  return {
    id: row.id,
    gender: row.gender,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function isDuplicateGender(error) {
  return error.code === "ER_DUP_ENTRY";
}

export function createGendersRouter({ pool, jwtSecret }) {
  const router = Router();
  const adminOnly = requireAdmin(jwtSecret);

  router.get("/genders", async (req, res) => {
    const [rows] = await pool.execute(
      `SELECT id, gender, is_active, created_at, updated_at
       FROM master_gender
       ORDER BY id`
    );
    return res.json({ genders: rows.map(toGender) });
  });

  router.post("/genders", adminOnly, async (req, res) => {
    const input = createGenderSchema.safeParse(req.body);
    if (!input.success) {
      return res.status(400).json({ error: "A valid gender value is required" });
    }

    let inserted;
    try {
      const [result] = await pool.execute(
        "INSERT INTO master_gender (gender, is_active) VALUES (?, ?)",
        [input.data.gender, input.data.isActive ?? true]
      );
      inserted = result;
    } catch (error) {
      if (isDuplicateGender(error)) {
        return res.status(409).json({ error: "This gender already exists" });
      }
      throw error;
    }

    const [rows] = await pool.execute(
      `SELECT id, gender, is_active, created_at, updated_at
       FROM master_gender
       WHERE id = ?
       LIMIT 1`,
      [inserted.insertId]
    );
    return res.status(201).json({ gender: toGender(rows[0]) });
  });

  router.patch("/genders/:id", adminOnly, async (req, res) => {
    const id = genderIdSchema.safeParse(req.params.id);
    const input = updateGenderSchema.safeParse(req.body);
    if (!id.success || !input.success || Object.keys(input.data ?? {}).length === 0) {
      return res.status(400).json({ error: "A valid gender ID and at least one valid field are required" });
    }

    const fields = [];
    const values = [];
    if (input.data.gender !== undefined) {
      fields.push("gender = ?");
      values.push(input.data.gender);
    }
    if (input.data.isActive !== undefined) {
      fields.push("is_active = ?");
      values.push(input.data.isActive);
    }
    values.push(id.data);

    try {
      await pool.execute(
        `UPDATE master_gender SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        values
      );
    } catch (error) {
      if (isDuplicateGender(error)) {
        return res.status(409).json({ error: "This gender already exists" });
      }
      throw error;
    }
    const [rows] = await pool.execute(
      `SELECT id, gender, is_active, created_at, updated_at
       FROM master_gender
       WHERE id = ?
       LIMIT 1`,
      [id.data]
    );
    if (!rows[0]) return res.status(404).json({ error: "Gender not found" });
    return res.json({ gender: toGender(rows[0]) });
  });

  router.delete("/genders/:id", adminOnly, async (req, res) => {
    const id = genderIdSchema.safeParse(req.params.id);
    if (!id.success) return res.status(400).json({ error: "Invalid gender ID" });

    try {
      const [result] = await pool.execute("DELETE FROM master_gender WHERE id = ?", [id.data]);
      if (result.affectedRows === 0) return res.status(404).json({ error: "Gender not found" });
    } catch (error) {
      if (error.code === "ER_ROW_IS_REFERENCED_2") {
        return res.status(409).json({ error: "Gender cannot be deleted while schemes use it" });
      }
      throw error;
    }

    return res.json({ message: "Gender deleted" });
  });

  return router;
}
