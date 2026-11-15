import { Router } from "express";
import { z } from "zod";
import { requireAdmin } from "../middleware/requireAdmin.js";

const isActiveSchema = z.union([
  z.boolean(),
  z.enum(["true", "false"]).transform((value) => value === "true")
]).optional();

const ministryIdSchema = z.string()
  .regex(/^[1-9]\d{0,9}$/)
  .refine((value) => Number(value) <= 4294967295);

const createMinistrySchema = z.object({
  ministry: z.string().trim().min(1).max(150),
  description: z.string().trim().max(5000).optional(),
  isActive: isActiveSchema
}).strict();

const updateMinistrySchema = z.object({
  ministry: z.string().trim().min(1).max(150).optional(),
  description: z.string().trim().max(5000).optional(),
  isActive: isActiveSchema
}).strict();

function toMinistry(row) {
  return {
    id: row.id,
    ministry: row.ministry,
    description: row.description,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function isDuplicateMinistry(error) {
  return error.code === "ER_DUP_ENTRY";
}

export function createMinistriesRouter({ pool, jwtSecret }) {
  const router = Router();
  const adminOnly = requireAdmin(jwtSecret);

  router.get("/ministries", async (req, res) => {
    const [rows] = await pool.execute(
      `SELECT id, ministry, description, is_active, created_at, updated_at
       FROM master_ministry
       ORDER BY ministry, id`
    );
    return res.json({ ministries: rows.map(toMinistry) });
  });

  router.post("/ministries", adminOnly, async (req, res) => {
    const input = createMinistrySchema.safeParse(req.body);
    if (!input.success) {
      return res.status(400).json({ error: "A valid ministry name is required" });
    }

    let inserted;
    try {
      const [result] = await pool.execute(
        `INSERT INTO master_ministry (ministry, description, is_active)
         VALUES (?, ?, ?)`,
        [
          input.data.ministry,
          input.data.description ?? "",
          input.data.isActive ?? true
        ]
      );
      inserted = result;
    } catch (error) {
      if (isDuplicateMinistry(error)) {
        return res.status(409).json({ error: "This ministry already exists" });
      }
      throw error;
    }

    const [rows] = await pool.execute(
      `SELECT id, ministry, description, is_active, created_at, updated_at
       FROM master_ministry
       WHERE id = ?
       LIMIT 1`,
      [inserted.insertId]
    );
    return res.status(201).json({ ministry: toMinistry(rows[0]) });
  });

  router.patch("/ministries/:id", adminOnly, async (req, res) => {
    const id = ministryIdSchema.safeParse(req.params.id);
    const input = updateMinistrySchema.safeParse(req.body);
    if (!id.success || !input.success || Object.keys(input.data ?? {}).length === 0) {
      return res.status(400).json({ error: "A valid ministry ID and at least one valid field are required" });
    }

    const fields = [];
    const values = [];
    if (input.data.ministry !== undefined) {
      fields.push("ministry = ?");
      values.push(input.data.ministry);
    }
    if (input.data.description !== undefined) {
      fields.push("description = ?");
      values.push(input.data.description);
    }
    if (input.data.isActive !== undefined) {
      fields.push("is_active = ?");
      values.push(input.data.isActive);
    }
    values.push(id.data);

    try {
      await pool.execute(
        `UPDATE master_ministry
         SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        values
      );
    } catch (error) {
      if (isDuplicateMinistry(error)) {
        return res.status(409).json({ error: "This ministry already exists" });
      }
      throw error;
    }

    const [rows] = await pool.execute(
      `SELECT id, ministry, description, is_active, created_at, updated_at
       FROM master_ministry
       WHERE id = ?
       LIMIT 1`,
      [id.data]
    );
    if (!rows[0]) return res.status(404).json({ error: "Ministry not found" });
    return res.json({ ministry: toMinistry(rows[0]) });
  });

  router.delete("/ministries/:id", adminOnly, async (req, res) => {
    const id = ministryIdSchema.safeParse(req.params.id);
    if (!id.success) return res.status(400).json({ error: "Invalid ministry ID" });

    try {
      const [result] = await pool.execute("DELETE FROM master_ministry WHERE id = ?", [id.data]);
      if (result.affectedRows === 0) return res.status(404).json({ error: "Ministry not found" });
    } catch (error) {
      if (error.code === "ER_ROW_IS_REFERENCED_2") {
        return res.status(409).json({ error: "Ministry cannot be deleted while schemes use it" });
      }
      throw error;
    }

    return res.json({ message: "Ministry deleted" });
  });

  return router;
}
