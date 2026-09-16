import assert from "node:assert/strict";
import { test } from "node:test";

import type { LowStockItem } from "./low-stock-report.js";
import {
  createLowStockReportService,
  type LowStockReportServiceDependencies,
  type SendReportEmailInput,
  type StoreReportInput,
} from "./low-stock-report.service.js";

const items: LowStockItem[] = [
  {
    productId: "11111111-1111-4111-8111-111111111111",
    sku: "MOUSE-001",
    name: "Mouse",
    availableQuantity: 0,
  },
];

function createInMemoryDependencies(options?: { failFirstEmail?: boolean }) {
  const reports = new Map<string, string>();
  const emailAttempts: SendReportEmailInput[] = [];
  let shouldFailEmail = options?.failFirstEmail ?? false;

  const dependencies: LowStockReportServiceDependencies = {
    listLowStockItems(threshold) {
      assert.equal(threshold, 5);
      return Promise.resolve(items);
    },

    storeReport(input: StoreReportInput) {
      if (reports.has(input.objectKey)) {
        return Promise.resolve("already-exists");
      }

      reports.set(input.objectKey, input.body);
      return Promise.resolve("created");
    },

    createDownloadUrl(objectKey) {
      return Promise.resolve(`https://example.com/download/${objectKey}`);
    },

    sendReportEmail(input) {
      emailAttempts.push(input);

      if (shouldFailEmail) {
        shouldFailEmail = false;
        return Promise.reject(new Error("SES temporarily unavailable"));
      }

      return Promise.resolve();
    },
  };

  return {
    dependencies,
    reports,
    emailAttempts,
  };
}

void test("creates a report and sends its download link", async () => {
  const fixture = createInMemoryDependencies();

  const service = createLowStockReportService(
    { threshold: 5 },
    fixture.dependencies,
  );

  const result = await service.run("2026-09-14");

  assert.deepEqual(result, {
    reportingPeriod: "2026-09-14",
    objectKey: "reports/low-stock/2026-09-14.json",
    itemCount: 1,
    storageOutcome: "created",
  });

  assert.equal(fixture.reports.size, 1);
  assert.match(
    fixture.reports.get(result.objectKey) ?? "",
    /"sku": "MOUSE-001"/,
  );

  assert.equal(fixture.emailAttempts.length, 1);
  assert.deepEqual(fixture.emailAttempts[0], {
    reportingPeriod: "2026-09-14",
    itemCount: 1,
    downloadUrl:
      "https://example.com/download/reports/low-stock/2026-09-14.json",
  });
});

void test("does not overwrite the report for a duplicate period", async () => {
  const fixture = createInMemoryDependencies();

  const service = createLowStockReportService(
    { threshold: 5 },
    fixture.dependencies,
  );

  const first = await service.run("2026-09-14");
  const duplicate = await service.run("2026-09-14");

  assert.equal(first.storageOutcome, "created");
  assert.equal(duplicate.storageOutcome, "already-exists");
  assert.equal(first.objectKey, duplicate.objectKey);
  assert.equal(fixture.reports.size, 1);

  // Notifications are at-least-once, so a duplicate is possible.
  assert.equal(fixture.emailAttempts.length, 2);
});

void test("retries notification without replacing an existing report", async () => {
  const fixture = createInMemoryDependencies({
    failFirstEmail: true,
  });

  const service = createLowStockReportService(
    { threshold: 5 },
    fixture.dependencies,
  );

  await assert.rejects(
    service.run("2026-09-14"),
    /SES temporarily unavailable/,
  );

  assert.equal(fixture.reports.size, 1);
  assert.equal(fixture.emailAttempts.length, 1);

  const retry = await service.run("2026-09-14");

  assert.equal(retry.storageOutcome, "already-exists");
  assert.equal(fixture.reports.size, 1);
  assert.equal(fixture.emailAttempts.length, 2);
});
