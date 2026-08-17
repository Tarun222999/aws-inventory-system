import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import {
  loadMigrationTarget,
  parseMigrationTarget,
} from "./migration-runner.js";

void test("loads the latest generated migration as the runner target", async () => {
  const target = await loadMigrationTarget(
    fileURLToPath(
      new URL("../../../packages/database/migrations", import.meta.url),
    ),
  );

  assert.equal(target.idx, 3);
  assert.match(target.tag, /^0003_/);
  assert.ok(target.when > 0);
});

void test("rejects an empty or malformed migration journal", () => {
  assert.throws(() => parseMigrationTarget("not-json"), /not valid JSON/);
  assert.throws(
    () => parseMigrationTarget(JSON.stringify({ entries: [] })),
    /contains no migrations/,
  );
});
