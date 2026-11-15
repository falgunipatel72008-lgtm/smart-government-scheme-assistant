import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import request from "supertest";
import { createApp } from "../src/app.js";

const jwtSecret = "test-secret-with-at-least-thirty-two-characters";
const adminToken = jwt.sign({}, jwtSecret, {
  algorithm: "HS256",
  subject: "admin",
  expiresIn: "1h"
});

test("categories are public to read and mutations require an admin token", async () => {
  let queries = 0;
  const pool = {
    execute: async () => {
      queries += 1;
      return [[{ id: 1, name: "Education", description: "Education support", image_url: null }]];
    }
  };
  const app = createApp({ pool, jwtSecret });

  const list = await request(app).get("/api/v1/categories");
  assert.equal(list.status, 200);
  assert.equal(list.body.categories[0].name, "Education");

  const create = await request(app)
    .post("/api/v1/categories")
    .send({ name: "Health", description: "Health support" });
  const update = await request(app).patch("/api/v1/categories/1").send({ name: "Updated" });
  const remove = await request(app).delete("/api/v1/categories/1");

  assert.equal(create.status, 401);
  assert.equal(update.status, 401);
  assert.equal(remove.status, 401);
  assert.equal(queries, 1);
});

test("admin can create a category with a Cloudinary image", async () => {
  let insertedValues;
  const pool = {
    execute: async (sql, values) => {
      if (sql.includes("INSERT INTO master_categories")) {
        insertedValues = values;
        return [{ insertId: 7 }];
      }
      return [[{
        id: 7,
        name: insertedValues[0],
        description: insertedValues[1],
        image_url: insertedValues[2],
        is_active: insertedValues[4],
        created_at: "2026-11-14T00:00:00.000Z",
        updated_at: "2026-11-14T00:00:00.000Z"
      }]];
    }
  };
  const cloudinary = {
    uploadImage: async (buffer) => {
      assert.equal(buffer.toString(), "image-content");
      return { url: "https://res.cloudinary.com/demo/category.png", publicId: "myscheme/categories/category" };
    },
    deleteImage: async () => ({ result: "ok" })
  };
  const app = createApp({ pool, jwtSecret, cloudinary });

  const response = await request(app)
    .post("/api/v1/categories")
    .set("Authorization", `Bearer ${adminToken}`)
    .field("name", "Education")
    .field("description", "Education support")
    .attach("image", Buffer.from("image-content"), "category.png");

  assert.equal(response.status, 201);
  assert.deepEqual(response.body.category, {
    id: 7,
    name: "Education",
    description: "Education support",
    imageUrl: "https://res.cloudinary.com/demo/category.png",
    isActive: true,
    createdAt: "2026-11-14T00:00:00.000Z",
    updatedAt: "2026-11-14T00:00:00.000Z"
  });
  assert.deepEqual(insertedValues, [
    "Education",
    "Education support",
    "https://res.cloudinary.com/demo/category.png",
    "myscheme/categories/category",
    true
  ]);
});

test("admin can update and delete a category", async () => {
  const category = {
    id: 7,
    name: "Education",
    description: "Education support",
    image_url: "https://res.cloudinary.com/demo/category.png",
    image_public_id: "myscheme/categories/category",
    is_active: 1,
    created_at: new Date(),
    updated_at: new Date()
  };
  const statements = [];
  const pool = {
    execute: async (sql) => {
      statements.push(sql);
      if (sql.startsWith("UPDATE")) {
        category.name = "Education and Training";
        category.is_active = 0;
        return [{ affectedRows: 1 }];
      }
      if (sql.includes("SELECT image_public_id")) return [[category]];
      if (sql.includes("WHERE id = ?")) return [[category]];
      return [{ affectedRows: 1 }];
    }
  };
  const cloudinary = {
    uploadImage: async () => {
      throw new Error("No image expected");
    },
    deleteImage: async () => ({ result: "ok" })
  };
  const app = createApp({ pool, jwtSecret, cloudinary });

  const update = await request(app)
    .patch("/api/v1/categories/7")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ name: "Education and Training", isActive: false });
  assert.equal(update.status, 200);
  assert.equal(update.body.category.name, "Education and Training");
  assert.equal(update.body.category.isActive, false);

  const remove = await request(app)
    .delete("/api/v1/categories/7")
    .set("Authorization", `Bearer ${adminToken}`);
  assert.equal(remove.status, 200);
  assert.equal(remove.body.message, "Category deleted");
  assert.equal(statements.filter((sql) => sql.startsWith("UPDATE")).length, 1);
  assert.equal(statements.filter((sql) => sql.startsWith("DELETE")).length, 1);
});
