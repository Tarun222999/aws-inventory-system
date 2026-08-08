import assert from "node:assert/strict";
import test from "node:test";

import { loadApiConfig, loadWorkerConfig } from "./index.js";

const databaseUrl = "postgresql://user:password@localhost:5432/order_platform";

void test("uses a conservative database pool default", () => {
  assert.equal(
    loadApiConfig({ DATABASE_URL: databaseUrl }).DATABASE_POOL_MAX,
    5,
  );
  assert.equal(
    loadWorkerConfig({ DATABASE_URL: databaseUrl }).DATABASE_POOL_MAX,
    5,
  );
});

void test("accepts a bounded database pool override", () => {
  assert.equal(
    loadApiConfig({
      DATABASE_URL: databaseUrl,
      DATABASE_POOL_MAX: "8",
    }).DATABASE_POOL_MAX,
    8,
  );
});

void test("rejects unsafe database pool limits", () => {
  for (const value of ["0", "21", "1.5", "not-a-number"]) {
    assert.throws(() =>
      loadApiConfig({
        DATABASE_URL: databaseUrl,
        DATABASE_POOL_MAX: value,
      }),
    );
  }
});
