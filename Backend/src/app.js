import express from "express";
import { createCategoriesRouter } from "./routes/categories.js";
import { createAuthRouter } from "./routes/auth.js";
import { createGendersRouter } from "./routes/genders.js";
import { createLocationsRouter } from "./routes/locations.js";
import { createMinistriesRouter } from "./routes/ministries.js";
import { createCriteriaOptionsRouter } from "./routes/criteriaOptions.js";
import { createSchemesRouter } from "./routes/schemes.js";

export function createApp({ pool, jwtSecret, cloudinary }) {
  const app = express();
  app.use(express.json({ limit: "100kb" }));
  app.use("/api/v1", createAuthRouter({ pool, jwtSecret }));
  app.use("/api/v1", createCategoriesRouter({ pool, jwtSecret, cloudinary }));
  app.use("/api/v1", createGendersRouter({ pool, jwtSecret }));
  app.use("/api/v1", createLocationsRouter({ pool, jwtSecret }));
  app.use("/api/v1", createMinistriesRouter({ pool, jwtSecret }));
  app.use("/api/v1", createCriteriaOptionsRouter({ pool }));
  app.use("/api/v1", createSchemesRouter({ pool, jwtSecret }));

  app.use((err, req, res, next) => {
    if (err.name === "MulterError") {
      const status = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
      return res.status(status).json({ error: err.message });
    }

    if (err.status >= 400 && err.status < 500) {
      return res.status(err.status).json({ error: err.message });
    }

    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}
