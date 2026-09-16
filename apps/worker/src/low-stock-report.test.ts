import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createLowStockReportDocument,
  createLowStockReportObjectKey,
  type LowStockItem,
} from "./low-stock-report.js";

const keyboard: LowStockItem = {
  productId: "22222222-2222-4222-8222-222222222222",
  sku: "KEYBOARD-001",
  name: "Keyboard",
  availableQuantity: 3,
};

const mouse: LowStockItem = {
  productId: "11111111-1111-4111-8111-111111111111",
  sku: "MOUSE-001",
  name: "Mouse",
  availableQuantity: 0,
};

void test("creates a deterministic S3 key for the reporting period", () => {
  const firstKey = createLowStockReportObjectKey("2026-09-14");
  const duplicateKey = createLowStockReportObjectKey("2026-09-14");

  assert.equal(firstKey, "reports/low-stock/2026-09-14.json");
  assert.equal(duplicateKey, firstKey);
});

void test("creates a sorted low-stock report without mutating its input", () => {
  const inputItems = [mouse, keyboard];

  const document = createLowStockReportDocument({
    reportingPeriod: "2026-09-14",
    threshold: 5,
    items: inputItems,
  });

  const report = JSON.parse(document) as {
    schemaVersion: number;
    reportingPeriod: string;
    threshold: number;
    itemCount: number;
    items: LowStockItem[];
  };

  assert.equal(report.schemaVersion, 1);
  assert.equal(report.reportingPeriod, "2026-09-14");
  assert.equal(report.threshold, 5);
  assert.equal(report.itemCount, 2);
  assert.deepEqual(
    report.items.map((item) => item.sku),
    ["KEYBOARD-001", "MOUSE-001"],
  );

  assert.deepEqual(inputItems, [mouse, keyboard]);
});

void test("produces identical documents for the same logical report", () => {
  const firstDocument = createLowStockReportDocument({
    reportingPeriod: "2026-09-14",
    threshold: 5,
    items: [mouse, keyboard],
  });

  const duplicateDocument = createLowStockReportDocument({
    reportingPeriod: "2026-09-14",
    threshold: 5,
    items: [keyboard, mouse],
  });

  assert.equal(duplicateDocument, firstDocument);
});

void test("rejects invalid reporting periods and thresholds", () => {
  assert.throws(
    () => createLowStockReportObjectKey("2026-02-30"),
    /real calendar date/,
  );

  assert.throws(
    () =>
      createLowStockReportDocument({
        reportingPeriod: "2026-09-14",
        threshold: -1,
        items: [],
      }),
    /non-negative integer/,
  );

  assert.throws(
    () =>
      createLowStockReportDocument({
        reportingPeriod: "2026-09-14",
        threshold: 2.5,
        items: [],
      }),
    /non-negative integer/,
  );
});
