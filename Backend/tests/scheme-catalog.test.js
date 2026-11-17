import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { schemeCatalog } from "../scripts/scheme-catalog.js";

test("the seed catalog has five or six distinct schemes in every seeded category", async () => {
  const categoriesSql = await readFile(
    new URL("../migrations/023_seed_master_categories.sql", import.meta.url),
    "utf8"
  );
  const ministrySql = await readFile(
    new URL("../migrations/011_seed_master_ministry.sql", import.meta.url),
    "utf8"
  );
  const seededCategories = [...categoriesSql.matchAll(/\('([^']+)',/g)].map((match) => match[1]);
  const seededMinistries = new Set(
    [...ministrySql.matchAll(/\('([^']+)', ''\)/g)].map((match) => match[1])
  );
  const knownCategories = new Set([...seededCategories, "Education"]);
  const codes = new Set();

  for (const scheme of schemeCatalog) {
    assert.ok(!codes.has(scheme.code), `duplicate scheme code: ${scheme.code}`);
    codes.add(scheme.code);
    assert.ok(seededMinistries.has(scheme.ministry), `unknown ministry: ${scheme.ministry}`);
    assert.ok(scheme.categories.length > 0, `scheme has no category: ${scheme.code}`);
    for (const category of scheme.categories) {
      assert.ok(knownCategories.has(category), `unknown category "${category}" on ${scheme.code}`);
    }
  }

  for (const category of seededCategories) {
    const categoryCodes = schemeCatalog
      .filter((scheme) => scheme.categories.includes(category))
      .map((scheme) => scheme.code);
    assert.ok(
      categoryCodes.length >= 5 && categoryCodes.length <= 6,
      `${category} has ${categoryCodes.length} catalog schemes`
    );
    assert.equal(new Set(categoryCodes).size, categoryCodes.length);
  }

  const educationCodes = [
    "PM-USP-CSSS",
    "NMMSS",
    "AICTE-PRAGATI",
    "AICTE-SAKSHAM",
    "PM-VIDYALAXMI"
  ];
  const educationCatalogCount = schemeCatalog.filter((scheme) => scheme.categories.includes("Education")).length;
  assert.equal(educationCatalogCount + educationCodes.length, 7);
});
