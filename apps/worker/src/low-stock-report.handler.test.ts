import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createLowStockReportHandler,
  type LowStockReportRunner,
} from "./low-stock-report.handler.js";

function createRunner() {
  const reportingPeriods: string[] = [];

  const runner: LowStockReportRunner = {
    run(reportingPeriod) {
      reportingPeriods.push(reportingPeriod);

      return Promise.resolve({
        reportingPeriod,
        success: true,
      });
    },
  };

  return {
    runner,
    reportingPeriods,
  };
}

void test("derives the Indian reporting date from scheduled time", async () => {
  const fixture = createRunner();

  const handler = createLowStockReportHandler(
    {
      timeZone: "Asia/Kolkata",
    },
    fixture.runner,
  );

  // This is September 13 in UTC but September 14 in India.
  await handler({
    scheduledTime: "2026-09-13T20:00:00.000Z",
  });

  assert.deepEqual(fixture.reportingPeriods, ["2026-09-14"]);
});

void test("accepts an explicit period for manual invocation", async () => {
  const fixture = createRunner();

  const handler = createLowStockReportHandler(
    {
      timeZone: "Asia/Kolkata",
    },
    fixture.runner,
  );

  const result = await handler({
    reportingPeriod: "2026-09-14",
  });

  assert.deepEqual(fixture.reportingPeriods, ["2026-09-14"]);

  assert.deepEqual(result, {
    reportingPeriod: "2026-09-14",
    success: true,
  });
});

void test("rejects invalid Scheduler input without running the service", async () => {
  const fixture = createRunner();

  const handler = createLowStockReportHandler(
    {
      timeZone: "Asia/Kolkata",
    },
    fixture.runner,
  );

  await assert.rejects(
    handler({}),
    /requires reportingPeriod or scheduledTime/,
  );

  await assert.rejects(
    handler({
      scheduledTime: "not-a-date",
    }),
    /valid timestamp/,
  );

  await assert.rejects(handler("not-an-object"), /must be an object/);

  assert.deepEqual(fixture.reportingPeriods, []);
});

void test("rejects an invalid configured timezone", () => {
  const fixture = createRunner();

  assert.throws(
    () =>
      createLowStockReportHandler(
        {
          timeZone: "Not/A_Timezone",
        },
        fixture.runner,
      ),
    RangeError,
  );
});
