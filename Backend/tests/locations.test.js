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

test("state and UT catalogs are public to read and require admin tokens to change", async () => {
  let queries = 0;
  const pool = {
    execute: async (sql) => {
      queries += 1;
      if (sql.includes("master_state")) {
        return [[{ id: 1, state: "Gujarat", is_active: 1, created_at: null, updated_at: null }]];
      }
      return [[{ id: 1, ut: "Ladakh", is_active: 1, created_at: null, updated_at: null }]];
    }
  };
  const app = createApp({ pool, jwtSecret });

  const states = await request(app).get("/api/v1/states");
  const unionTerritories = await request(app).get("/api/v1/union-territories");
  const locations = await request(app).get("/api/v1/locations");
  assert.equal(states.status, 200);
  assert.equal(states.body.states[0].state, "Gujarat");
  assert.equal(unionTerritories.status, 200);
  assert.equal(unionTerritories.body.unionTerritories[0].ut, "Ladakh");
  assert.deepEqual(locations.body.locations.map(({ name, isUnionTerritory }) => ({
    name,
    isUnionTerritory
  })), [
    { name: "Gujarat", isUnionTerritory: false },
    { name: "Ladakh", isUnionTerritory: true }
  ]);

  const createState = await request(app).post("/api/v1/states").send({ state: "Test State" });
  const createUt = await request(app).post("/api/v1/union-territories").send({ ut: "Test UT" });
  assert.equal(createState.status, 401);
  assert.equal(createUt.status, 401);
  assert.equal(queries, 4);
});

test("admin can create, edit, and delete state and UT values", async () => {
  const records = {
    master_state: [],
    master_union_territory: []
  };
  const fieldForTable = {
    master_state: "state",
    master_union_territory: "ut"
  };
  const pool = {
    execute: async (sql, values = []) => {
      const table = sql.match(/master_state|master_union_territory/)[0];
      const field = fieldForTable[table];
      if (sql.startsWith("INSERT")) {
        const row = { id: records[table].length + 1, [field]: values[0], is_active: values[1] ? 1 : 0 };
        records[table].push(row);
        return [{ insertId: row.id }];
      }
      if (sql.startsWith("UPDATE")) {
        const row = records[table].find((item) => item.id === Number(values[values.length - 1]));
        if (!row) return [{ affectedRows: 0 }];
        if (sql.includes(`${field} = ?`)) row[field] = values[0];
        if (sql.includes("is_active = ?")) {
          row.is_active = values[sql.includes(`${field} = ?`) ? 1 : 0] ? 1 : 0;
        }
        return [{ affectedRows: row ? 1 : 0 }];
      }
      if (sql.startsWith("DELETE")) {
        const index = records[table].findIndex((item) => item.id === Number(values[0]));
        if (index < 0) return [{ affectedRows: 0 }];
        records[table].splice(index, 1);
        return [{ affectedRows: 1 }];
      }
      if (sql.includes("WHERE id = ?")) {
        return [records[table].filter((row) => row.id === Number(values[0]))];
      }
      return [records[table]];
    }
  };
  const app = createApp({ pool, jwtSecret });

  const createState = await request(app)
    .post("/api/v1/states")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ state: "Test State" });
  assert.equal(createState.status, 201);
  assert.equal(createState.body.state.state, "Test State");

  const updateState = await request(app)
    .patch("/api/v1/states/1")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ isActive: false });
  assert.equal(updateState.status, 200);
  assert.equal(updateState.body.state.isActive, false);

  const deleteState = await request(app)
    .delete("/api/v1/states/1")
    .set("Authorization", `Bearer ${adminToken}`);
  assert.equal(deleteState.status, 200);

  const createUt = await request(app)
    .post("/api/v1/union-territories")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ ut: "Test UT" });
  assert.equal(createUt.status, 201);
  assert.equal(createUt.body.unionTerritory.ut, "Test UT");

  const updateUt = await request(app)
    .patch("/api/v1/union-territories/1")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ ut: "Updated UT" });
  assert.equal(updateUt.status, 200);
  assert.equal(updateUt.body.unionTerritory.ut, "Updated UT");

  const deleteUt = await request(app)
    .delete("/api/v1/union-territories/1")
    .set("Authorization", `Bearer ${adminToken}`);
  assert.equal(deleteUt.status, 200);
});
