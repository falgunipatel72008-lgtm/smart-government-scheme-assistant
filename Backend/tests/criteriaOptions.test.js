import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../src/app.js";

const jwtSecret = "test-secret-with-at-least-thirty-two-characters";

test("active criteria dimensions and options are publicly available grouped by dimension", async () => {
  let queries = 0;
  const pool = {
    execute: async () => {
      queries += 1;
      return [[
        {
          dimension_id: 1,
          dimension_code: "GENDER",
          dimension_name: "Gender",
          input_type: "SINGLE_SELECT",
          option_id: 1,
          option_code: "FEMALE",
          option_label: "female",
          option_sort_order: 1
        },
        {
          dimension_id: 2,
          dimension_code: "SOCIAL_CATEGORY",
          dimension_name: "Social Category",
          input_type: "SINGLE_SELECT",
          option_id: 10,
          option_code: "OBC",
          option_label: "OBC",
          option_sort_order: 20
        },
        {
          dimension_id: 2,
          dimension_code: "SOCIAL_CATEGORY",
          dimension_name: "Social Category",
          input_type: "SINGLE_SELECT",
          option_id: 11,
          option_code: "SC",
          option_label: "SC",
          option_sort_order: 30
        },
        {
          dimension_id: 3,
          dimension_code: "AGE",
          dimension_name: "Age",
          input_type: "NUMERIC",
          option_id: null,
          option_code: null,
          option_label: null,
          option_sort_order: null
        }
      ]];
    }
  };
  const app = createApp({ pool, jwtSecret });

  const response = await request(app).get("/api/v1/criteria/options");

  assert.equal(response.status, 200);
  assert.deepEqual(response.body.dimensions, [
    {
      id: 1,
      code: "GENDER",
      name: "Gender",
      inputType: "SINGLE_SELECT",
      options: [
        { id: 1, code: "FEMALE", label: "female", sortOrder: 1 }
      ]
    },
    {
      id: 2,
      code: "SOCIAL_CATEGORY",
      name: "Social Category",
      inputType: "SINGLE_SELECT",
      options: [
        { id: 10, code: "OBC", label: "OBC", sortOrder: 20 },
        { id: 11, code: "SC", label: "SC", sortOrder: 30 }
      ]
    },
    {
      id: 3,
      code: "AGE",
      name: "Age",
      inputType: "NUMERIC",
      options: []
    }
  ]);
  assert.equal(queries, 1);
});
