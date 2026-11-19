import { Router } from "express";
import { z } from "zod";
import { requireAdmin } from "../middleware/requireAdmin.js";

const idSchema = z.number().int().positive().max(4294967295);
const queryIdSchema = z.coerce.number().int().positive().max(4294967295);
const schemeIdParamSchema = z.string()
  .regex(/^[1-9]\d{0,9}$/)
  .refine((value) => Number(value) <= 4294967295)
  .transform(Number);
const uniqueIds = (ids) => new Set(ids).size === ids.length;
const idListSchema = z.array(idSchema).max(100).refine(uniqueIds, "IDs must be unique");
const contentFormatSchema = z.enum(["bullets", "numbered", "steps", "checklist", "paragraphs"]);
const contentItemSchema = z.string().trim().min(1).max(5000);

const structuredContentSchema = z.object({
  format: contentFormatSchema,
  items: z.array(contentItemSchema).min(1).max(100)
}).strict();

const documentRequirementSchema = z.object({
  name: z.string().trim().min(1).max(255),
  description: z.string().trim().max(1000).optional(),
  requirement: z.enum(["mandatory", "optional", "conditional"])
}).strict();

const documentsSchema = z.union([
  structuredContentSchema,
  z.object({
    format: z.literal("checklist"),
    items: z.array(documentRequirementSchema).min(1).max(100),
    verified: z.boolean().optional(),
    sourceNote: z.string().trim().max(500).optional()
  }).strict()
]);

const applicationModeSchema = z.object({
  enabled: z.boolean(),
  subsections: z.array(z.object({
    title: z.string().trim().min(1).max(150),
    format: contentFormatSchema,
    steps: z.array(contentItemSchema).min(1).max(100)
  }).strict()).max(20)
}).strict().refine(
  (mode) => !mode.enabled || mode.subsections.length > 0,
  "Enabled application methods need at least one subsection"
);

const numericRuleSchema = z.object({
  min: z.number().nonnegative().nullable(),
  max: z.number().nonnegative().nullable()
}).strict().refine(
  (rule) => rule.min !== null || rule.max !== null,
  "Provide at least one numeric bound"
).refine(
  (rule) => rule.min === null || rule.max === null || rule.min <= rule.max,
  "Minimum must not exceed maximum"
);

const createSchemeSchema = z.object({
  name: z.string().trim().min(1).max(255),
  code: z.string().trim().min(1).max(60).optional(),
  ministryId: idSchema,
  categoryIds: idListSchema.min(1),
  coverage: z.object({
    allIndia: z.boolean(),
    stateIds: idListSchema,
    unionTerritoryIds: idListSchema
  }).strict().refine(
    (coverage) => coverage.allIndia
      ? coverage.stateIds.length === 0 && coverage.unionTerritoryIds.length === 0
      : coverage.stateIds.length + coverage.unionTerritoryIds.length > 0,
    "Choose All India or at least one state or union territory"
  ),
  details: structuredContentSchema,
  benefits: structuredContentSchema,
  eligibilityInfo: structuredContentSchema,
  documents: documentsSchema,
  applicationProcess: z.object({
    online: applicationModeSchema,
    offline: applicationModeSchema
  }).strict().refine(
    (process) => process.online.enabled || process.offline.enabled,
    "Enable online or offline application"
  ),
  criteria: z.record(z.string().min(1).max(50), idListSchema),
  numericRules: z.record(z.string().min(1).max(50), numericRuleSchema)
}).strict();

const listSchemesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(1000000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
  categoryId: queryIdSchema.optional(),
  ministryId: queryIdSchema.optional(),
  stateId: queryIdSchema.optional(),
  unionTerritoryId: queryIdSchema.optional(),
  genderId: queryIdSchema.optional(),
  search: z.string().trim().max(120).default("")
}).strict();

class InvalidReferenceError extends Error {}

function parseJson(value) {
  return typeof value === "string" ? JSON.parse(value) : value;
}

function mapSchemeRow(row, related) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ministry: { id: row.ministry_id, name: row.ministry_name },
    categories: related.categories,
    coverage: {
      type: row.coverage_type,
      states: related.states,
      unionTerritories: related.unionTerritories
    },
    details: parseJson(row.details),
    benefits: parseJson(row.benefits),
    eligibilityInfo: parseJson(row.eligibility),
    applicationProcess: parseJson(row.application_process),
    documents: parseJson(row.documents),
    genders: related.genders,
    criteria: related.criteria,
    numericRules: related.numericRules
  };
}

async function assertActiveIds(connection, table, ids) {
  if (ids.length === 0) return true;
  const placeholders = ids.map(() => "?").join(", ");
  const [rows] = await connection.execute(
    `SELECT id FROM ${table} WHERE is_active = TRUE AND id IN (${placeholders})`,
    ids
  );
  return rows.length === ids.length;
}

async function insertIdMappings(connection, table, foreignKey, schemeId, ids) {
  if (ids.length === 0) return;
  const values = ids.map(() => "(?, ?)").join(", ");
  const parameters = ids.flatMap((id) => [schemeId, id]);
  await connection.execute(
    `INSERT INTO ${table} (scheme_id, ${foreignKey}) VALUES ${values}`,
    parameters
  );
}

async function validateCriteria(connection, criteria, numericRules) {
  const genderIds = criteria.GENDER ?? [];
  const genderDimensionIsActive = genderIds.length === 0 || (await connection.execute(
    "SELECT id FROM criteria_dimension WHERE code = 'GENDER' AND is_active = TRUE AND input_type <> 'NUMERIC' LIMIT 1"
  ))[0].length === 1;
  if (!genderDimensionIsActive || !(await assertActiveIds(connection, "master_gender", genderIds))) {
    throw new InvalidReferenceError("One or more selected gender options are unavailable");
  }

  const optionGroups = Object.entries(criteria).filter(([code, ids]) => code !== "GENDER" && ids.length > 0);
  const optionIds = optionGroups.flatMap(([, ids]) => ids);
  if (optionIds.length > 0) {
    const placeholders = optionIds.map(() => "?").join(", ");
    const [rows] = await connection.execute(
      `SELECT o.id, d.code
       FROM criteria_option o
       JOIN criteria_dimension d ON d.id = o.dimension_id
       WHERE o.is_active = TRUE
         AND d.is_active = TRUE
         AND d.input_type <> 'NUMERIC'
         AND o.id IN (${placeholders})`,
      optionIds
    );
    if (rows.length !== optionIds.length) {
      throw new InvalidReferenceError("One or more selected criteria options are unavailable");
    }

    const optionDimensions = new Map(rows.map((row) => [row.id, row.code]));
    for (const [code, ids] of optionGroups) {
      if (ids.some((id) => optionDimensions.get(id) !== code)) {
        throw new InvalidReferenceError("A selected criteria option does not belong to its criterion");
      }
    }
  }

  const numericCodes = Object.keys(numericRules);
  const numericDimensions = new Map();
  if (numericCodes.length > 0) {
    const placeholders = numericCodes.map(() => "?").join(", ");
    const [rows] = await connection.execute(
      `SELECT id, code
       FROM criteria_dimension
       WHERE is_active = TRUE AND input_type = 'NUMERIC' AND code IN (${placeholders})`,
      numericCodes
    );
    if (rows.length !== numericCodes.length) {
      throw new InvalidReferenceError("One or more numeric criteria are unavailable");
    }
    for (const row of rows) numericDimensions.set(row.code, row.id);
  }

  return { genderIds, optionIds, numericDimensions };
}

function validationDetails(issues) {
  return issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message
  }));
}

async function enrichSchemeRows(pool, schemeRows) {
  const schemeIds = schemeRows.map((row) => row.id);
  const relatedByScheme = new Map(schemeIds.map((id) => [id, {
    categories: [],
    states: [],
    unionTerritories: [],
    genders: [],
    criteria: [],
    numericRules: []
  }]));
  if (schemeIds.length === 0) return [];

  const placeholders = schemeIds.map(() => "?").join(", ");
  const [categoryRows] = await pool.execute(
    `SELECT sc.scheme_id, c.id, c.name
     FROM scheme_categories sc
     JOIN master_categories c ON c.id = sc.category_id
     WHERE sc.scheme_id IN (${placeholders})
     ORDER BY c.name`,
    schemeIds
  );
  for (const row of categoryRows) {
    relatedByScheme.get(row.scheme_id).categories.push({ id: row.id, name: row.name });
  }

  const [locationRows] = await pool.execute(
    `SELECT ss.scheme_id, st.id, st.state AS name, 'STATE' AS location_type
     FROM scheme_states ss
     JOIN master_state st ON st.id = ss.state_id
     WHERE ss.scheme_id IN (${placeholders})
     UNION ALL
     SELECT sut.scheme_id, ut.id, ut.ut AS name, 'UNION_TERRITORY' AS location_type
     FROM scheme_union_territories sut
     JOIN master_union_territory ut ON ut.id = sut.union_territory_id
     WHERE sut.scheme_id IN (${placeholders})
     ORDER BY name`,
    [...schemeIds, ...schemeIds]
  );
  for (const row of locationRows) {
    const collection = row.location_type === "STATE" ? "states" : "unionTerritories";
    relatedByScheme.get(row.scheme_id)[collection].push({ id: row.id, name: row.name });
  }

  const [genderRows] = await pool.execute(
    `SELECT sg.scheme_id, g.id, g.gender AS name
     FROM scheme_genders sg
     JOIN master_gender g ON g.id = sg.gender_id
     WHERE sg.scheme_id IN (${placeholders})
     ORDER BY g.gender`,
    schemeIds
  );
  for (const row of genderRows) {
    relatedByScheme.get(row.scheme_id).genders.push({ id: row.id, name: row.name });
  }

  const [criteriaRows] = await pool.execute(
    `SELECT sc.scheme_id, d.id AS dimension_id, d.code AS dimension_code,
            d.name AS dimension_name, o.id AS option_id, o.code AS option_code, o.label
     FROM scheme_criteria sc
     JOIN criteria_option o ON o.id = sc.criteria_option_id
     JOIN criteria_dimension d ON d.id = o.dimension_id
     WHERE sc.scheme_id IN (${placeholders})
     ORDER BY d.sort_order, o.sort_order, o.label`,
    schemeIds
  );
  for (const row of criteriaRows) {
    const criteria = relatedByScheme.get(row.scheme_id).criteria;
    let dimension = criteria.find((item) => item.id === row.dimension_id);
    if (!dimension) {
      dimension = {
        id: row.dimension_id,
        code: row.dimension_code,
        name: row.dimension_name,
        options: []
      };
      criteria.push(dimension);
    }
    dimension.options.push({ id: row.option_id, code: row.option_code, label: row.label });
  }

  const [numericRows] = await pool.execute(
    `SELECT snr.scheme_id, d.id AS dimension_id, d.code AS dimension_code,
            d.name AS dimension_name, snr.min_value, snr.max_value
     FROM scheme_numeric_rule snr
     JOIN criteria_dimension d ON d.id = snr.dimension_id
     WHERE snr.scheme_id IN (${placeholders})
     ORDER BY d.sort_order, d.name`,
    schemeIds
  );
  for (const row of numericRows) {
    relatedByScheme.get(row.scheme_id).numericRules.push({
      dimensionId: row.dimension_id,
      code: row.dimension_code,
      name: row.dimension_name,
      min: row.min_value === null ? null : Number(row.min_value),
      max: row.max_value === null ? null : Number(row.max_value)
    });
  }

  return schemeRows.map((row) => mapSchemeRow(row, relatedByScheme.get(row.id)));
}

export function createSchemesRouter({ pool, jwtSecret }) {
  const router = Router();
  const adminOnly = requireAdmin(jwtSecret);

  router.get("/schemes", async (req, res) => {
    const parsed = listSchemesQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Invalid scheme listing parameters",
        details: validationDetails(parsed.error.issues)
      });
    }

    const { page, pageSize, search, categoryId, ministryId, stateId, unionTerritoryId, genderId } = parsed.data;
    const conditions = ["s.is_active = TRUE"];
    const parameters = [];
    if (categoryId !== undefined) {
      conditions.push(
        "EXISTS (SELECT 1 FROM scheme_categories sc WHERE sc.scheme_id = s.id AND sc.category_id = ?)"
      );
      parameters.push(categoryId);
    }
    if (ministryId !== undefined) {
      conditions.push("s.ministry_id = ?");
      parameters.push(ministryId);
    }
    if (stateId !== undefined) {
      conditions.push(
        "(s.coverage_type = 'ALL_INDIA' OR EXISTS (SELECT 1 FROM scheme_states ss WHERE ss.scheme_id = s.id AND ss.state_id = ?))"
      );
      parameters.push(stateId);
    }
    if (unionTerritoryId !== undefined) {
      conditions.push(
        "(s.coverage_type = 'ALL_INDIA' OR EXISTS (SELECT 1 FROM scheme_union_territories sut WHERE sut.scheme_id = s.id AND sut.union_territory_id = ?))"
      );
      parameters.push(unionTerritoryId);
    }
    if (genderId !== undefined) {
      conditions.push(
        "EXISTS (SELECT 1 FROM scheme_genders sg WHERE sg.scheme_id = s.id AND sg.gender_id = ?)"
      );
      parameters.push(genderId);
    }
    if (search) {
      const like = `%${search}%`;
      conditions.push(`(
        s.name LIKE ? OR COALESCE(s.code, '') LIKE ? OR m.ministry LIKE ?
        OR CAST(s.details AS CHAR) LIKE ? OR CAST(s.benefits AS CHAR) LIKE ?
        OR CAST(s.eligibility AS CHAR) LIKE ?
      )`);
      parameters.push(like, like, like, like, like, like);
    }

    const whereClause = conditions.join(" AND ");
    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS total
       FROM schemes s
       JOIN master_ministry m ON m.id = s.ministry_id
       WHERE ${whereClause}`,
      parameters
    );
    const totalItems = Number(countRows[0].total);
    const offset = (page - 1) * pageSize;
    const [schemeRows] = await pool.execute(
      `SELECT s.id, s.code, s.name, s.ministry_id, m.ministry AS ministry_name,
              s.coverage_type, s.details, s.benefits, s.eligibility,
              s.application_process, s.documents, s.is_active, s.created_at, s.updated_at
       FROM schemes s
       JOIN master_ministry m ON m.id = s.ministry_id
       WHERE ${whereClause}
       ORDER BY s.created_at DESC, s.id DESC
       LIMIT ? OFFSET ?`,
      [...parameters, pageSize, offset]
    );

    const totalPages = Math.ceil(totalItems / pageSize);
    return res.json({
      schemes: await enrichSchemeRows(pool, schemeRows),
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages,
        hasPrevious: page > 1 && totalItems > 0,
        hasNext: page < totalPages
      }
    });
  });

  router.get("/schemes/:id", async (req, res) => {
    const parsedId = schemeIdParamSchema.safeParse(req.params.id);
    if (!parsedId.success) return res.status(400).json({ error: "Invalid scheme ID" });

    const [rows] = await pool.execute(
      `SELECT s.id, s.code, s.name, s.ministry_id, m.ministry AS ministry_name,
              s.coverage_type, s.details, s.benefits, s.eligibility,
              s.application_process, s.documents, s.is_active, s.created_at, s.updated_at
       FROM schemes s
       JOIN master_ministry m ON m.id = s.ministry_id
       WHERE s.id = ? AND s.is_active = TRUE
       LIMIT 1`,
      [parsedId.data]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Scheme not found" });

    const [scheme] = await enrichSchemeRows(pool, rows);
    return res.json({ scheme });
  });

  router.patch("/schemes/:id", adminOnly, async (req, res) => {
    const parsedId = schemeIdParamSchema.safeParse(req.params.id);
    const parsed = createSchemeSchema.safeParse(req.body);
    if (!parsedId.success) return res.status(400).json({ error: "Invalid scheme ID" });
    if (!parsed.success) {
      return res.status(400).json({
        error: "Invalid scheme data",
        details: validationDetails(parsed.error.issues)
      });
    }

    const input = parsed.data;
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [existingRows] = await connection.execute(
        "SELECT id FROM schemes WHERE id = ? LIMIT 1",
        [parsedId.data]
      );
      if (existingRows.length === 0) {
        throw new InvalidReferenceError("Scheme not found");
      }
      if (!(await assertActiveIds(connection, "master_ministry", [input.ministryId]))) {
        throw new InvalidReferenceError("The selected ministry is unavailable");
      }
      if (!(await assertActiveIds(connection, "master_categories", input.categoryIds))) {
        throw new InvalidReferenceError("One or more selected categories are unavailable");
      }
      if (!(await assertActiveIds(connection, "master_state", input.coverage.stateIds))) {
        throw new InvalidReferenceError("One or more selected states are unavailable");
      }
      if (!(await assertActiveIds(connection, "master_union_territory", input.coverage.unionTerritoryIds))) {
        throw new InvalidReferenceError("One or more selected union territories are unavailable");
      }

      const { genderIds, optionIds, numericDimensions } = await validateCriteria(
        connection,
        input.criteria,
        input.numericRules
      );

      await connection.execute(
        `UPDATE schemes
         SET code = ?, name = ?, ministry_id = ?, coverage_type = ?, details = ?,
             benefits = ?, eligibility = ?, application_process = ?, documents = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
          input.code ?? null,
          input.name,
          input.ministryId,
          input.coverage.allIndia ? "ALL_INDIA" : "SELECTED",
          JSON.stringify(input.details),
          JSON.stringify(input.benefits),
          JSON.stringify(input.eligibilityInfo),
          JSON.stringify(input.applicationProcess),
          JSON.stringify(input.documents),
          parsedId.data
        ]
      );

      await connection.execute("DELETE FROM scheme_categories WHERE scheme_id = ?", [parsedId.data]);
      await connection.execute("DELETE FROM scheme_states WHERE scheme_id = ?", [parsedId.data]);
      await connection.execute("DELETE FROM scheme_union_territories WHERE scheme_id = ?", [parsedId.data]);
      await connection.execute("DELETE FROM scheme_genders WHERE scheme_id = ?", [parsedId.data]);
      await connection.execute("DELETE FROM scheme_criteria WHERE scheme_id = ?", [parsedId.data]);
      await connection.execute("DELETE FROM scheme_numeric_rule WHERE scheme_id = ?", [parsedId.data]);

      await insertIdMappings(connection, "scheme_categories", "category_id", parsedId.data, input.categoryIds);
      await insertIdMappings(connection, "scheme_states", "state_id", parsedId.data, input.coverage.stateIds);
      await insertIdMappings(
        connection,
        "scheme_union_territories",
        "union_territory_id",
        parsedId.data,
        input.coverage.unionTerritoryIds
      );
      await insertIdMappings(connection, "scheme_genders", "gender_id", parsedId.data, genderIds);
      await insertIdMappings(connection, "scheme_criteria", "criteria_option_id", parsedId.data, optionIds);

      const numericEntries = Object.entries(input.numericRules);
      if (numericEntries.length > 0) {
        const values = numericEntries.map(() => "(?, ?, ?, ?)").join(", ");
        const parameters = numericEntries.flatMap(([code, rule]) => [
          parsedId.data,
          numericDimensions.get(code),
          rule.min,
          rule.max
        ]);
        await connection.execute(
          `INSERT INTO scheme_numeric_rule (scheme_id, dimension_id, min_value, max_value)
           VALUES ${values}`,
          parameters
        );
      }

      await connection.commit();
      return res.json({ scheme: { id: parsedId.data, name: input.name, code: input.code ?? null } });
    } catch (error) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("Could not roll back scheme update transaction", rollbackError);
      }
      if (error instanceof InvalidReferenceError) {
        return res.status(error.message === "Scheme not found" ? 404 : 400).json({ error: error.message });
      }
      if (error.code === "ER_DUP_ENTRY") {
        return res.status(409).json({ error: "A scheme with this code already exists" });
      }
      throw error;
    } finally {
      connection.release();
    }
  });

  router.patch("/schemes/:id/status", adminOnly, async (req, res) => {
    const parsedId = schemeIdParamSchema.safeParse(req.params.id);
    const input = z.object({ isActive: z.boolean() }).strict().safeParse(req.body);
    if (!parsedId.success || !input.success) {
      return res.status(400).json({ error: "A valid scheme ID and active status are required" });
    }

    const [result] = await pool.execute(
      "UPDATE schemes SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [input.data.isActive, parsedId.data]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: "Scheme not found" });
    return res.json({ message: "Scheme status updated" });
  });

  router.post("/schemes", adminOnly, async (req, res) => {
    const parsed = createSchemeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Invalid scheme data",
        details: validationDetails(parsed.error.issues)
      });
    }
    const input = parsed.data;
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      if (!(await assertActiveIds(connection, "master_ministry", [input.ministryId]))) {
        throw new InvalidReferenceError("The selected ministry is unavailable");
      }
      if (!(await assertActiveIds(connection, "master_categories", input.categoryIds))) {
        throw new InvalidReferenceError("One or more selected categories are unavailable");
      }
      if (!(await assertActiveIds(connection, "master_state", input.coverage.stateIds))) {
        throw new InvalidReferenceError("One or more selected states are unavailable");
      }
      if (!(await assertActiveIds(connection, "master_union_territory", input.coverage.unionTerritoryIds))) {
        throw new InvalidReferenceError("One or more selected union territories are unavailable");
      }

      const { genderIds, optionIds, numericDimensions } = await validateCriteria(
        connection,
        input.criteria,
        input.numericRules
      );

      const [insertResult] = await connection.execute(
        `INSERT INTO schemes
           (code, name, ministry_id, coverage_type, details, benefits, eligibility,
            application_process, documents)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          input.code ?? null,
          input.name,
          input.ministryId,
          input.coverage.allIndia ? "ALL_INDIA" : "SELECTED",
          JSON.stringify(input.details),
          JSON.stringify(input.benefits),
          JSON.stringify(input.eligibilityInfo),
          JSON.stringify(input.applicationProcess),
          JSON.stringify(input.documents)
        ]
      );
      const schemeId = insertResult.insertId;

      await insertIdMappings(connection, "scheme_categories", "category_id", schemeId, input.categoryIds);
      await insertIdMappings(connection, "scheme_states", "state_id", schemeId, input.coverage.stateIds);
      await insertIdMappings(
        connection,
        "scheme_union_territories",
        "union_territory_id",
        schemeId,
        input.coverage.unionTerritoryIds
      );
      await insertIdMappings(connection, "scheme_genders", "gender_id", schemeId, genderIds);
      await insertIdMappings(connection, "scheme_criteria", "criteria_option_id", schemeId, optionIds);

      const numericEntries = Object.entries(input.numericRules);
      if (numericEntries.length > 0) {
        const values = numericEntries.map(() => "(?, ?, ?, ?)").join(", ");
        const parameters = numericEntries.flatMap(([code, rule]) => [
          schemeId,
          numericDimensions.get(code),
          rule.min,
          rule.max
        ]);
        await connection.execute(
          `INSERT INTO scheme_numeric_rule (scheme_id, dimension_id, min_value, max_value)
           VALUES ${values}`,
          parameters
        );
      }

      const [schemeRows] = await connection.execute(
        "SELECT id, created_at, updated_at FROM schemes WHERE id = ? LIMIT 1",
        [schemeId]
      );
      await connection.commit();

      return res.status(201).json({
        scheme: {
          id: schemeId,
          name: input.name,
          code: input.code ?? null,
          isActive: true,
          createdAt: schemeRows[0].created_at,
          updatedAt: schemeRows[0].updated_at
        }
      });
    } catch (error) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("Could not roll back scheme creation transaction", rollbackError);
      }
      if (error instanceof InvalidReferenceError) {
        return res.status(400).json({ error: error.message });
      }
      if (error.code === "ER_DUP_ENTRY") {
        return res.status(409).json({ error: "A scheme with this code already exists" });
      }
      throw error;
    } finally {
      connection.release();
    }
  });

  return router;
}
