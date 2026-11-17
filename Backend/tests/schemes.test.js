import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import jwt from "jsonwebtoken";
import { createApp } from "../src/app.js";

const jwtSecret = "test-secret-with-at-least-thirty-two-characters";
const adminToken = jwt.sign({}, jwtSecret, { subject: "admin" });

function createSchemeBody(overrides = {}) {
  return {
    name: "Rural Tailoring Assistance",
    code: "RTA-2026",
    ministryId: 7,
    categoryIds: [3],
    coverage: {
      allIndia: true,
      stateIds: [],
      unionTerritoryIds: []
    },
    details: { format: "paragraphs", items: ["Support for tailoring businesses."] },
    benefits: { format: "bullets", items: ["Financial assistance."] },
    eligibilityInfo: { format: "numbered", items: ["Applicants must be residents."] },
    documents: { format: "checklist", items: ["Identity proof."] },
    applicationProcess: {
      online: {
        enabled: true,
        subsections: [{ title: "Apply online", format: "steps", steps: ["Complete the form."] }]
      },
      offline: { enabled: false, subsections: [] }
    },
    criteria: {
      GENDER: [2],
      SOCIAL_CATEGORY: [11]
    },
    numericRules: {
      AGE: { min: 18, max: 60 }
    },
    ...overrides
  };
}

function createDatabasePool({ inactiveTable } = {}) {
  const statements = [];
  const transactions = [];
  const connection = {
    beginTransaction: async () => transactions.push("begin"),
    commit: async () => transactions.push("commit"),
    rollback: async () => transactions.push("rollback"),
    release: () => transactions.push("release"),
    execute: async (sql, params = []) => {
      statements.push({ sql, params });
      if (sql.includes("FROM master_ministry")) {
        return [inactiveTable === "master_ministry" ? [] : [{ id: params[0] }]];
      }
      if (sql.includes("FROM master_categories")) {
        return [inactiveTable === "master_categories" ? [] : params.map((id) => ({ id }))];
      }
      if (sql.includes("FROM master_state")) {
        return [inactiveTable === "master_state" ? [] : params.map((id) => ({ id }))];
      }
      if (sql.includes("FROM master_union_territory")) {
        return [inactiveTable === "master_union_territory" ? [] : params.map((id) => ({ id }))];
      }
      if (sql.includes("FROM criteria_dimension WHERE code = 'GENDER'")) {
        return [[{ id: 1 }]];
      }
      if (sql.includes("FROM master_gender")) {
        return [[{ id: params[0] }]];
      }
      if (sql.includes("FROM criteria_option")) {
        return [[{ id: 11, code: "SOCIAL_CATEGORY" }]];
      }
      if (sql.includes("FROM criteria_dimension") && sql.includes("input_type = 'NUMERIC'")) {
        return [[{ id: 4, code: "AGE" }]];
      }
      if (sql.includes("INSERT INTO schemes")) {
        return [{ insertId: 42 }];
      }
      if (sql.includes("SELECT id, created_at, updated_at FROM schemes")) {
        return [[{ id: 42, created_at: "2026-03-19T00:00:00.000Z", updated_at: "2026-03-19T00:00:00.000Z" }]];
      }
      return [{ affectedRows: 1 }];
    }
  };

  return {
    pool: { getConnection: async () => connection },
    statements,
    transactions
  };
}

test("creates a scheme and its criteria mappings in one transaction", async () => {
  const database = createDatabasePool();
  const app = createApp({ pool: database.pool, jwtSecret });

  const response = await request(app)
    .post("/api/v1/schemes")
    .set("Authorization", `Bearer ${adminToken}`)
    .send(createSchemeBody());

  assert.equal(response.status, 201);
  assert.equal(response.body.scheme.id, 42);
  assert.equal(response.body.scheme.name, "Rural Tailoring Assistance");
  assert.deepEqual(database.transactions, ["begin", "commit", "release"]);

  const schemeInsert = database.statements.find(({ sql }) => sql.includes("INSERT INTO schemes"));
  assert.ok(schemeInsert);
  assert.equal(schemeInsert.params[0], "RTA-2026");
  assert.equal(JSON.parse(schemeInsert.params[4]).items[0], "Support for tailoring businesses.");
  assert.ok(database.statements.some(({ sql }) => sql.includes("INSERT INTO scheme_genders")));
  assert.ok(database.statements.some(({ sql }) => sql.includes("INSERT INTO scheme_criteria")));
  assert.ok(database.statements.some(({ sql }) => sql.includes("INSERT INTO scheme_numeric_rule")));
});

test("rejects numeric bounds with a minimum above the maximum before opening a transaction", async () => {
  const database = createDatabasePool();
  const app = createApp({ pool: database.pool, jwtSecret });

  const response = await request(app)
    .post("/api/v1/schemes")
    .set("Authorization", `Bearer ${adminToken}`)
    .send(createSchemeBody({ numericRules: { AGE: { min: 61, max: 60 } } }));

  assert.equal(response.status, 400);
  assert.equal(response.body.error, "Invalid scheme data");
  assert.deepEqual(database.transactions, []);
});

test("rolls back when a selected master category is inactive", async () => {
  const database = createDatabasePool({ inactiveTable: "master_categories" });
  const app = createApp({ pool: database.pool, jwtSecret });

  const response = await request(app)
    .post("/api/v1/schemes")
    .set("Authorization", `Bearer ${adminToken}`)
    .send(createSchemeBody());

  assert.equal(response.status, 400);
  assert.match(response.body.error, /categories are unavailable/);
  assert.deepEqual(database.transactions, ["begin", "rollback", "release"]);
  assert.equal(database.statements.some(({ sql }) => sql.includes("INSERT INTO schemes")), false);
});

test("rolls back when a criteria option is submitted under the wrong dimension", async () => {
  const database = createDatabasePool();
  const app = createApp({ pool: database.pool, jwtSecret });

  const response = await request(app)
    .post("/api/v1/schemes")
    .set("Authorization", `Bearer ${adminToken}`)
    .send(createSchemeBody({
      criteria: {
        GENDER: [2],
        WORK_STATUS: [11]
      }
    }));

  assert.equal(response.status, 400);
  assert.match(response.body.error, /does not belong to its criterion/);
  assert.deepEqual(database.transactions, ["begin", "rollback", "release"]);
  assert.equal(database.statements.some(({ sql }) => sql.includes("INSERT INTO schemes")), false);
});

test("lists saved schemes with related data, filters, and pagination", async () => {
  const statements = [];
  const schemeRow = {
    id: 8,
    code: "RTA-2026",
    name: "Rural Tailoring Assistance",
    ministry_id: 7,
    ministry_name: "Ministry of Rural Development",
    coverage_type: "SELECTED",
    details: JSON.stringify({ format: "paragraphs", items: ["Scheme details."] }),
    benefits: { format: "bullets", items: ["Financial assistance."] },
    eligibility: JSON.stringify({ format: "numbered", items: ["Residents only."] }),
    application_process: JSON.stringify({
      online: { enabled: true, subsections: [] },
      offline: { enabled: false, subsections: [] }
    }),
    documents: JSON.stringify({ format: "checklist", items: ["Identity proof."] }),
    is_active: 1,
    created_at: "2026-03-19T00:00:00.000Z",
    updated_at: "2026-03-19T00:00:00.000Z"
  };
  const pool = {
    execute: async (sql, params = []) => {
      statements.push({ sql, params });
      if (sql.includes("COUNT(*) AS total")) return [[{ total: 3 }]];
      if (sql.includes("FROM schemes s")) return [[schemeRow]];
      if (sql.includes("FROM scheme_categories")) {
        return [[{ scheme_id: 8, id: 3, name: "Employment" }]];
      }
      if (sql.includes("FROM scheme_states")) {
        return [[
          { scheme_id: 8, id: 4, name: "Gujarat", location_type: "STATE" },
          { scheme_id: 8, id: 2, name: "Delhi", location_type: "UNION_TERRITORY" }
        ]];
      }
      if (sql.includes("FROM scheme_genders")) {
        return [[{ scheme_id: 8, id: 1, name: "female" }]];
      }
      if (sql.includes("FROM scheme_criteria")) {
        return [[{
          scheme_id: 8,
          dimension_id: 5,
          dimension_code: "SOCIAL_CATEGORY",
          dimension_name: "Social Category",
          option_id: 11,
          option_code: "OBC",
          label: "OBC"
        }]];
      }
      if (sql.includes("FROM scheme_numeric_rule")) {
        return [[{
          scheme_id: 8,
          dimension_id: 2,
          dimension_code: "AGE",
          dimension_name: "Age",
          min_value: "18.00",
          max_value: "60.00"
        }]];
      }
      return [[]];
    }
  };
  const app = createApp({ pool, jwtSecret });

  const response = await request(app)
    .get("/api/v1/schemes?page=2&pageSize=2&categoryId=3&ministryId=7&stateId=4&search=tailor");

  assert.equal(response.status, 200);
  assert.deepEqual(response.body.pagination, {
    page: 2,
    pageSize: 2,
    totalItems: 3,
    totalPages: 2,
    hasPrevious: true,
    hasNext: false
  });
  assert.equal(response.body.schemes.length, 1);
  assert.equal(response.body.schemes[0].ministry.name, "Ministry of Rural Development");
  assert.deepEqual(response.body.schemes[0].categories, [{ id: 3, name: "Employment" }]);
  assert.deepEqual(response.body.schemes[0].coverage.states, [{ id: 4, name: "Gujarat" }]);
  assert.deepEqual(response.body.schemes[0].coverage.unionTerritories, [{ id: 2, name: "Delhi" }]);
  assert.deepEqual(response.body.schemes[0].criteria[0].options, [{ id: 11, code: "OBC", label: "OBC" }]);
  assert.deepEqual(response.body.schemes[0].numericRules[0], {
    dimensionId: 2,
    code: "AGE",
    name: "Age",
    min: 18,
    max: 60
  });
  const pageQuery = statements.find(({ sql }) => sql.includes("LIMIT ? OFFSET ?"));
  assert.deepEqual(pageQuery.params.slice(-2), [2, 2]);
  assert.match(pageQuery.sql, /EXISTS \(SELECT 1 FROM scheme_categories/);
  assert.match(pageQuery.sql, /EXISTS \(SELECT 1 FROM scheme_states/);
  assert.match(pageQuery.sql, /s\.coverage_type = 'ALL_INDIA' OR EXISTS/);
});

test("rejects invalid scheme pagination before querying the database", async () => {
  let queries = 0;
  const pool = {
    execute: async () => {
      queries += 1;
      return [[]];
    }
  };
  const app = createApp({ pool, jwtSecret });

  const response = await request(app).get("/api/v1/schemes?page=0&pageSize=1000");

  assert.equal(response.status, 400);
  assert.equal(response.body.error, "Invalid scheme listing parameters");
  assert.equal(queries, 0);
});

test("loads a scheme detail record and its related eligibility data", async () => {
  const detailRow = {
    id: 8,
    code: "RTA-2026",
    name: "Rural Tailoring Assistance",
    ministry_id: 7,
    ministry_name: "Ministry of Rural Development",
    coverage_type: "ALL_INDIA",
    details: JSON.stringify({ format: "paragraphs", items: ["Scheme details."] }),
    benefits: JSON.stringify({ format: "bullets", items: ["Financial assistance."] }),
    eligibility: JSON.stringify({ format: "numbered", items: ["Residents only."] }),
    application_process: JSON.stringify({
      online: { enabled: true, subsections: [] },
      offline: { enabled: false, subsections: [] }
    }),
    documents: JSON.stringify({ format: "checklist", items: ["Identity proof."] }),
    is_active: 1,
    created_at: "2026-03-19T00:00:00.000Z",
    updated_at: "2026-03-19T00:00:00.000Z"
  };
  const pool = {
    execute: async (sql) => {
      if (sql.includes("WHERE s.id = ?")) return [[detailRow]];
      if (sql.includes("FROM scheme_categories")) {
        return [[{ scheme_id: 8, id: 3, name: "Employment" }]];
      }
      if (sql.includes("FROM scheme_states")) return [[]];
      if (sql.includes("FROM scheme_genders")) {
        return [[{ scheme_id: 8, id: 1, name: "female" }]];
      }
      if (sql.includes("FROM scheme_criteria")) {
        return [[{
          scheme_id: 8,
          dimension_id: 5,
          dimension_code: "SOCIAL_CATEGORY",
          dimension_name: "Social Category",
          option_id: 11,
          option_code: "OBC",
          label: "OBC"
        }]];
      }
      if (sql.includes("FROM scheme_numeric_rule")) return [[]];
      return [[]];
    }
  };
  const app = createApp({ pool, jwtSecret });

  const response = await request(app).get("/api/v1/schemes/8");

  assert.equal(response.status, 200);
  assert.equal(response.body.scheme.id, 8);
  assert.equal(response.body.scheme.name, "Rural Tailoring Assistance");
  assert.deepEqual(response.body.scheme.categories, [{ id: 3, name: "Employment" }]);
  assert.deepEqual(response.body.scheme.genders, [{ id: 1, name: "female" }]);
  assert.deepEqual(response.body.scheme.criteria[0].options, [{ id: 11, code: "OBC", label: "OBC" }]);
});

test("returns 404 for an inactive or missing scheme detail record", async () => {
  let queries = 0;
  const app = createApp({
    pool: {
      execute: async () => {
        queries += 1;
        return [[]];
      }
    },
    jwtSecret
  });

  const response = await request(app).get("/api/v1/schemes/999");

  assert.equal(response.status, 404);
  assert.equal(response.body.error, "Scheme not found");
  assert.equal(queries, 1);
});
