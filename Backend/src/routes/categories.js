import { Router } from "express";
import { z } from "zod";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { uploadCategoryImage } from "../middleware/uploadCategoryImage.js";

const isActiveSchema = z.union([
  z.boolean(),
  z.enum(["true", "false"]).transform((value) => value === "true")
]).optional();

const createCategorySchema = z.object({
  name: z.string().trim().min(1).max(150),
  description: z.string().trim().min(1).max(2000),
  isActive: isActiveSchema
}).strict();

const updateCategorySchema = z.object({
  name: z.string().trim().min(1).max(150).optional(),
  description: z.string().trim().min(1).max(2000).optional(),
  isActive: isActiveSchema
}).strict();

const categoryIdSchema = z.string()
  .regex(/^[1-9]\d{0,9}$/)
  .refine((value) => Number(value) <= 4294967295);

function toCategory(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    imageUrl: row.image_url,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function isDuplicateName(error) {
  return error.code === "ER_DUP_ENTRY";
}

async function discardUploadedImage(cloudinary, publicId) {
  try {
    await cloudinary.deleteImage(publicId);
  } catch (error) {
    console.error("Could not clean up an unused category image in Cloudinary", error);
  }
}

async function removeOldImage(cloudinary, publicId) {
  if (!publicId) return null;

  try {
    await cloudinary.deleteImage(publicId);
    return null;
  } catch (error) {
    console.error("Could not remove the previous category image from Cloudinary", error);
    return "Category was saved, but its previous image could not be removed from Cloudinary.";
  }
}

export function createCategoriesRouter({ pool, jwtSecret, cloudinary }) {
  const router = Router();
  const adminOnly = requireAdmin(jwtSecret);

  router.get("/categories", async (req, res) => {
    const [rows] = await pool.execute(
      `SELECT id, name, description, image_url, is_active, created_at, updated_at
       FROM master_categories
       ORDER BY name, id`
    );
    return res.json({ categories: rows.map(toCategory) });
  });

  router.post("/categories", adminOnly, uploadCategoryImage, async (req, res) => {
    const input = createCategorySchema.safeParse(req.body);
    if (!input.success) {
      return res.status(400).json({ error: "A category name and description are required" });
    }
    if (req.file && !cloudinary) {
      return res.status(503).json({ error: "Image uploads are not configured" });
    }

    const image = req.file ? await cloudinary.uploadImage(req.file.buffer) : null;

    let inserted;
    try {
      const [result] = await pool.execute(
        `INSERT INTO master_categories (name, description, image_url, image_public_id, is_active)
         VALUES (?, ?, ?, ?, ?)`,
        [
          input.data.name,
          input.data.description,
          image?.url ?? null,
          image?.publicId ?? null,
          input.data.isActive ?? true
        ]
      );
      inserted = result;
    } catch (error) {
      if (image) await discardUploadedImage(cloudinary, image.publicId);
      if (isDuplicateName(error)) {
        return res.status(409).json({ error: "A category with this name already exists" });
      }
      throw error;
    }

    const [rows] = await pool.execute(
      `SELECT id, name, description, image_url, is_active, created_at, updated_at
       FROM master_categories
       WHERE id = ?
       LIMIT 1`,
      [inserted.insertId]
    );
    return res.status(201).json({ category: toCategory(rows[0]) });
  });

  router.patch("/categories/:id", adminOnly, uploadCategoryImage, async (req, res) => {
    const id = categoryIdSchema.safeParse(req.params.id);
    const input = updateCategorySchema.safeParse(req.body);
    if (!id.success || !input.success || (!req.file && Object.keys(input.data ?? {}).length === 0)) {
      return res.status(400).json({ error: "A valid category ID and at least one valid field are required" });
    }
    if (req.file && !cloudinary) {
      return res.status(503).json({ error: "Image uploads are not configured" });
    }

    const [rows] = await pool.execute(
      `SELECT id, name, description, image_url, image_public_id, is_active, created_at, updated_at
       FROM master_categories
       WHERE id = ?
       LIMIT 1`,
      [id.data]
    );
    const current = rows[0];
    if (!current) return res.status(404).json({ error: "Category not found" });

    const image = req.file ? await cloudinary.uploadImage(req.file.buffer) : null;
    const fields = [];
    const values = [];
    if (input.data.name !== undefined) {
      fields.push("name = ?");
      values.push(input.data.name);
    }
    if (input.data.description !== undefined) {
      fields.push("description = ?");
      values.push(input.data.description);
    }
    if (input.data.isActive !== undefined) {
      fields.push("is_active = ?");
      values.push(input.data.isActive);
    }
    if (image) {
      fields.push("image_url = ?", "image_public_id = ?");
      values.push(image.url, image.publicId);
    }
    fields.push("updated_at = CURRENT_TIMESTAMP");
    values.push(id.data);

    try {
      await pool.execute(
        `UPDATE master_categories SET ${fields.join(", ")} WHERE id = ?`,
        values
      );
    } catch (error) {
      if (image) await discardUploadedImage(cloudinary, image.publicId);
      if (isDuplicateName(error)) {
        return res.status(409).json({ error: "A category with this name already exists" });
      }
      throw error;
    }

    const [updatedRows] = await pool.execute(
      `SELECT id, name, description, image_url, is_active, created_at, updated_at
       FROM master_categories
       WHERE id = ?
       LIMIT 1`,
      [id.data]
    );
    if (!updatedRows[0]) return res.status(404).json({ error: "Category not found" });
    const warning = image
      ? await removeOldImage(cloudinary, current.image_public_id)
      : null;
    return res.json({
      category: toCategory(updatedRows[0]),
      ...(warning ? { warning } : {})
    });
  });

  router.delete("/categories/:id", adminOnly, async (req, res) => {
    const id = categoryIdSchema.safeParse(req.params.id);
    if (!id.success) return res.status(400).json({ error: "Invalid category ID" });

    const [rows] = await pool.execute(
      "SELECT image_public_id FROM master_categories WHERE id = ? LIMIT 1",
      [id.data]
    );
    if (!rows[0]) return res.status(404).json({ error: "Category not found" });

    try {
      await pool.execute("DELETE FROM master_categories WHERE id = ?", [id.data]);
    } catch (error) {
      if (error.code === "ER_ROW_IS_REFERENCED_2") {
        return res.status(409).json({ error: "Category cannot be deleted while schemes use it" });
      }
      throw error;
    }

    const warning = await removeOldImage(cloudinary, rows[0].image_public_id);
    return res.json({
      message: "Category deleted",
      ...(warning ? { warning } : {})
    });
  });

  return router;
}
