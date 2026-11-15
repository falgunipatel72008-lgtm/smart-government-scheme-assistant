import { Router } from "express";
import { z } from "zod";
import { requireAdmin } from "../middleware/requireAdmin.js";

const isActiveSchema = z.union([
  z.boolean(),
  z.enum(["true", "false"]).transform((value) => value === "true")
]).optional();

const idSchema = z.string()
  .regex(/^[1-9]\d{0,9}$/)
  .refine((value) => Number(value) <= 4294967295);

const locations = [
  {
    path: "/states",
    table: "master_state",
    field: "state",
    collection: "states",
    singular: "state"
  },
  {
    path: "/union-territories",
    table: "master_union_territory",
    field: "ut",
    collection: "unionTerritories",
    singular: "unionTerritory"
  }
];

function toLocation(row, field) {
  return {
    id: row.id,
    [field]: row[field],
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function selectLocation(table, field) {
  return `SELECT id, ${field}, is_active, created_at, updated_at
          FROM ${table}
          WHERE id = ?
          LIMIT 1`;
}

function addLocationRoutes(router, { pool, adminOnly, location }) {
  const { path, table, field, collection, singular } = location;
  const createSchema = z.object({
    [field]: z.string().trim().min(1).max(100),
    isActive: isActiveSchema
  }).strict();
  const updateSchema = z.object({
    [field]: z.string().trim().min(1).max(100).optional(),
    isActive: isActiveSchema
  }).strict();

  router.get(path, async (req, res) => {
    const [rows] = await pool.execute(
      `SELECT id, ${field}, is_active, created_at, updated_at FROM ${table} ORDER BY id`
    );
    return res.json({ [collection]: rows.map((row) => toLocation(row, field)) });
  });

  router.post(path, adminOnly, async (req, res) => {
    const input = createSchema.safeParse(req.body);
    if (!input.success) {
      return res.status(400).json({ error: `A valid ${field} value is required` });
    }

    let inserted;
    try {
      const [result] = await pool.execute(
        `INSERT INTO ${table} (${field}, is_active) VALUES (?, ?)`,
        [input.data[field], input.data.isActive ?? true]
      );
      inserted = result;
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY") {
        return res.status(409).json({ error: `This ${field} already exists` });
      }
      throw error;
    }

    const [rows] = await pool.execute(selectLocation(table, field), [inserted.insertId]);
    return res.status(201).json({ [singular]: toLocation(rows[0], field) });
  });

  router.patch(`${path}/:id`, adminOnly, async (req, res) => {
    const id = idSchema.safeParse(req.params.id);
    const input = updateSchema.safeParse(req.body);
    if (!id.success || !input.success || Object.keys(input.data ?? {}).length === 0) {
      return res.status(400).json({ error: `A valid ID and at least one valid field are required` });
    }

    const fields = [];
    const values = [];
    if (input.data[field] !== undefined) {
      fields.push(`${field} = ?`);
      values.push(input.data[field]);
    }
    if (input.data.isActive !== undefined) {
      fields.push("is_active = ?");
      values.push(input.data.isActive);
    }
    values.push(id.data);

    try {
      await pool.execute(
        `UPDATE ${table} SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        values
      );
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY") {
        return res.status(409).json({ error: `This ${field} already exists` });
      }
      throw error;
    }

    const [rows] = await pool.execute(selectLocation(table, field), [id.data]);
    if (!rows[0]) return res.status(404).json({ error: `${field} not found` });
    return res.json({ [singular]: toLocation(rows[0], field) });
  });

  router.delete(`${path}/:id`, adminOnly, async (req, res) => {
    const id = idSchema.safeParse(req.params.id);
    if (!id.success) return res.status(400).json({ error: "Invalid ID" });

    try {
      const [result] = await pool.execute(`DELETE FROM ${table} WHERE id = ?`, [id.data]);
      if (result.affectedRows === 0) return res.status(404).json({ error: `${field} not found` });
    } catch (error) {
      if (error.code === "ER_ROW_IS_REFERENCED_2") {
        return res.status(409).json({ error: `This ${field} cannot be deleted while schemes use it` });
      }
      throw error;
    }

    return res.json({ message: `${field} deleted` });
  });
}

export function createLocationsRouter({ pool, jwtSecret }) {
  const router = Router();
  const adminOnly = requireAdmin(jwtSecret);

  router.get("/locations", async (req, res) => {
    const [stateRows, unionTerritoryRows] = await Promise.all([
      pool.execute(
        "SELECT id, state, is_active, created_at, updated_at FROM master_state ORDER BY id"
      ),
      pool.execute(
        "SELECT id, ut, is_active, created_at, updated_at FROM master_union_territory ORDER BY id"
      )
    ]);

    const locations = [
      ...stateRows[0].map((row) => ({
        id: row.id,
        name: row.state,
        isUnionTerritory: false,
        isActive: Boolean(row.is_active),
        createdAt: row.created_at,
        updatedAt: row.updated_at
      })),
      ...unionTerritoryRows[0].map((row) => ({
        id: row.id,
        name: row.ut,
        isUnionTerritory: true,
        isActive: Boolean(row.is_active),
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }))
    ];

    return res.json({ locations });
  });

  for (const location of locations) {
    addLocationRoutes(router, { pool, adminOnly, location });
  }

  return router;
}
