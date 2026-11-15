import { Router } from "express";

export function createCriteriaOptionsRouter({ pool }) {
  const router = Router();

  router.get("/criteria/options", async (req, res) => {
    const [rows] = await pool.execute(
      `SELECT
         d.id AS dimension_id,
         d.code AS dimension_code,
         d.name AS dimension_name,
         d.input_type,
         COALESCE(o.id, g.id) AS option_id,
         COALESCE(o.code, UPPER(REPLACE(g.gender, ' ', '_'))) AS option_code,
         COALESCE(o.label, g.gender) AS option_label,
         COALESCE(o.sort_order, g.id) AS option_sort_order
       FROM criteria_dimension d
       LEFT JOIN criteria_option o
         ON o.dimension_id = d.id
        AND o.is_active = TRUE
        AND d.code <> 'GENDER'
       LEFT JOIN master_gender g
         ON d.code = 'GENDER'
        AND g.is_active = TRUE
       WHERE d.is_active = TRUE
       ORDER BY d.sort_order, COALESCE(o.sort_order, g.id), COALESCE(o.label, g.gender)`
    );

    const dimensions = new Map();
    for (const row of rows) {
      if (!dimensions.has(row.dimension_id)) {
        dimensions.set(row.dimension_id, {
          id: row.dimension_id,
          code: row.dimension_code,
          name: row.dimension_name,
          inputType: row.input_type,
          options: []
        });
      }

      if (row.option_id !== null) {
        dimensions.get(row.dimension_id).options.push({
          id: row.option_id,
          code: row.option_code,
          label: row.option_label,
          sortOrder: row.option_sort_order
        });
      }
    }

    return res.json({ dimensions: [...dimensions.values()] });
  });

  return router;
}
