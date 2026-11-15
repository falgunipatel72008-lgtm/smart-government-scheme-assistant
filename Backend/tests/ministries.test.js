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

test("ministries are public to read and mutations require an admin token", async () => {
  let queries = 0;
  const pool = {
    execute: async () => {
      queries += 1;
      return [[{
        id: 1,
        ministry: "Ministry of Education",
        description: "",
        is_active: 1,
        created_at: null,
        updated_at: null
      }]];
    }
  };
  const app = createApp({ pool, jwtSecret });

  const list = await request(app).get("/api/v1/ministries");
  assert.equal(list.status, 200);
  assert.equal(list.body.ministries[0].ministry, "Ministry of Education");
  assert.equal(list.body.ministries[0].isActive, true);

  const create = await request(app).post("/api/v1/ministries").send({ ministry: "Test Ministry" });
  const update = await request(app).patch("/api/v1/ministries/1").send({ isActive: false });
  const remove = await request(app).delete("/api/v1/ministries/1");

  assert.equal(create.status, 401);
  assert.equal(update.status, 401);
  assert.equal(remove.status, 401);
  assert.equal(queries, 1);
});

test("admin can create, edit, and delete a ministry", async () => {
  let row = null;
  const pool = {
    execute: async (sql, values = []) => {
      if (sql.startsWith("INSERT")) {
        row = {
          id: 3,
          ministry: values[0],
          description: values[1],
          is_active: values[2] ? 1 : 0
        };
        return [{ insertId: 3 }];
      }
      if (sql.startsWith("UPDATE")) {
        if (sql.includes("description = ?")) row.description = values[0];
        if (sql.includes("is_active = ?")) row.is_active = values[sql.includes("description = ?") ? 1 : 0] ? 1 : 0;
        return [{ affectedRows: 1 }];
      }
      if (sql.startsWith("DELETE")) {
        const deleted = row !== null;
        row = null;
        return [{ affectedRows: deleted ? 1 : 0 }];
      }
      return [[row ? {
        ...row,
        created_at: "2026-11-14T00:00:00.000Z",
        updated_at: "2026-11-14T00:00:00.000Z"
      } : undefined].filter(Boolean)];
    }
  };
  const app = createApp({ pool, jwtSecret });

  const create = await request(app)
    .post("/api/v1/ministries")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ ministry: "Test Ministry", description: "Initial description" });
  assert.equal(create.status, 201);
  assert.equal(create.body.ministry.description, "Initial description");
  assert.equal(create.body.ministry.isActive, true);

  const update = await request(app)
    .patch("/api/v1/ministries/3")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ description: "Updated description", isActive: false });
  assert.equal(update.status, 200);
  assert.equal(update.body.ministry.description, "Updated description");
  assert.equal(update.body.ministry.isActive, false);

  const remove = await request(app)
    .delete("/api/v1/ministries/3")
    .set("Authorization", `Bearer ${adminToken}`);
  assert.equal(remove.status, 200);
  assert.equal(remove.body.message, "Ministry deleted");
});
