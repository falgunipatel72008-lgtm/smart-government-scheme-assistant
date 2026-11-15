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

test("genders are public to read and mutations require an admin token", async () => {
  let queries = 0;
  const pool = {
    execute: async () => {
      queries += 1;
      return [[{
        id: 1,
        gender: "male",
        is_active: 1,
        created_at: "2026-11-14T00:00:00.000Z",
        updated_at: "2026-11-14T00:00:00.000Z"
      }]];
    }
  };
  const app = createApp({ pool, jwtSecret });

  const list = await request(app).get("/api/v1/genders");
  assert.equal(list.status, 200);
  assert.equal(list.body.genders[0].gender, "male");
  assert.equal(list.body.genders[0].isActive, true);

  const create = await request(app).post("/api/v1/genders").send({ gender: "custom" });
  const update = await request(app).patch("/api/v1/genders/1").send({ isActive: false });
  const remove = await request(app).delete("/api/v1/genders/1");

  assert.equal(create.status, 401);
  assert.equal(update.status, 401);
  assert.equal(remove.status, 401);
  assert.equal(queries, 1);
});

test("admin can create, deactivate, and delete a gender", async () => {
  let row = null;
  const pool = {
    execute: async (sql, values) => {
      if (sql.startsWith("INSERT")) {
        row = { id: 4, gender: values[0], is_active: values[1] ? 1 : 0 };
        return [{ insertId: 4 }];
      }
      if (sql.startsWith("UPDATE")) {
        row.is_active = values[0] ? 1 : 0;
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
    .post("/api/v1/genders")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ gender: "custom" });
  assert.equal(create.status, 201);
  assert.equal(create.body.gender.gender, "custom");
  assert.equal(create.body.gender.isActive, true);

  const update = await request(app)
    .patch("/api/v1/genders/4")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ isActive: false });
  assert.equal(update.status, 200);
  assert.equal(update.body.gender.isActive, false);

  const remove = await request(app)
    .delete("/api/v1/genders/4")
    .set("Authorization", `Bearer ${adminToken}`);
  assert.equal(remove.status, 200);
  assert.equal(remove.body.message, "Gender deleted");
});
