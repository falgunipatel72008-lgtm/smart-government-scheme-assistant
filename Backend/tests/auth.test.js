import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../src/app.js";
import { hashPassword } from "../src/auth/password.js";

const jwtSecret = "test-secret-with-at-least-thirty-two-characters";

test("admin can log in and use a protected endpoint", async () => {
  const passwordHash = await hashPassword("correct-password");
  const pool = {
    execute: async () => [[{ id: "admin", password_hash: passwordHash }]]
  };
  const app = createApp({ pool, jwtSecret });

  const login = await request(app)
    .post("/api/v1/auth/login")
    .send({ id: "admin", password: "correct-password" });

  assert.equal(login.status, 200);
  assert.equal(login.body.admin.id, "admin");
  assert.ok(login.body.token);

  const profile = await request(app)
    .get("/api/v1/admin/me")
    .set("Authorization", `Bearer ${login.body.token}`);

  assert.equal(profile.status, 200);
  assert.deepEqual(profile.body, { admin: { id: "admin" } });
});

test("admin login rejects invalid credentials", async () => {
  const passwordHash = await hashPassword("correct-password");
  const pool = {
    execute: async () => [[{ id: "admin", password_hash: passwordHash }]]
  };
  const app = createApp({ pool, jwtSecret });

  const response = await request(app)
    .post("/api/v1/auth/login")
    .send({ id: "admin", password: "wrong-password" });

  assert.equal(response.status, 401);
});

test("protected endpoint rejects requests without a token", async () => {
  const app = createApp({ pool: {}, jwtSecret });
  const response = await request(app).get("/api/v1/admin/me");

  assert.equal(response.status, 401);
});
