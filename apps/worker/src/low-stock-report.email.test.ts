import assert from "node:assert/strict";
import { test } from "node:test";

import type { SendEmailCommand } from "@aws-sdk/client-sesv2";

import { createLowStockReportEmailNotifier } from "./low-stock-report.email.js";

const validInput = {
  reportingPeriod: "2026-09-14",
  itemCount: 2,
  downloadUrl: "https://report-bucket.s3.ap-south-1.amazonaws.com/temporary",
};

void test("constructs and sends the low-stock report email", async () => {
  const commands: SendEmailCommand[] = [];

  const notifier = createLowStockReportEmailNotifier(
    {
      region: "ap-south-1",
      fromEmailAddress: "reports@example.com",
      toEmailAddress: "operations@example.com",
    },
    {
      sendCommand(command) {
        commands.push(command);

        return Promise.resolve({
          MessageId: "ses-message-123",
        });
      },
    },
  );

  await notifier.sendReportEmail(validInput);

  assert.equal(commands.length, 1);

  const input = commands[0]?.input;
  const subject = input?.Content?.Simple?.Subject?.Data;
  const body = input?.Content?.Simple?.Body?.Text?.Data;

  assert.equal(input?.FromEmailAddress, "reports@example.com");
  assert.deepEqual(input?.Destination?.ToAddresses, ["operations@example.com"]);
  assert.equal(subject, "[TEST] Low-stock report — 2026-09-14");
  assert.match(body ?? "", /Low-stock products: 2/);
  assert.match(body ?? "", /https:\/\/report-bucket/);
});

void test("rejects an insecure URL before calling SES", async () => {
  let sendCount = 0;

  const notifier = createLowStockReportEmailNotifier(
    {
      region: "ap-south-1",
      fromEmailAddress: "reports@example.com",
      toEmailAddress: "operations@example.com",
    },
    {
      sendCommand() {
        sendCount += 1;

        return Promise.resolve({
          MessageId: "should-not-be-used",
        });
      },
    },
  );

  await assert.rejects(
    notifier.sendReportEmail({
      ...validInput,
      downloadUrl: "http://example.com/insecure",
    }),
    /must use HTTPS/,
  );

  assert.equal(sendCount, 0);
});

void test("fails when SES does not return a MessageId", async () => {
  const notifier = createLowStockReportEmailNotifier(
    {
      region: "ap-south-1",
      fromEmailAddress: "reports@example.com",
      toEmailAddress: "operations@example.com",
    },
    {
      sendCommand() {
        return Promise.resolve({});
      },
    },
  );

  await assert.rejects(
    notifier.sendReportEmail(validInput),
    /Amazon SES did not return a MessageId/,
  );
});

void test("rejects an invalid item count before calling SES", async () => {
  let sendCount = 0;

  const notifier = createLowStockReportEmailNotifier(
    {
      region: "ap-south-1",
      fromEmailAddress: "reports@example.com",
      toEmailAddress: "operations@example.com",
    },
    {
      sendCommand() {
        sendCount += 1;
        return Promise.resolve({
          MessageId: "should-not-be-used",
        });
      },
    },
  );

  await assert.rejects(
    notifier.sendReportEmail({
      ...validInput,
      itemCount: -1,
    }),
    /non-negative integer/,
  );

  assert.equal(sendCount, 0);
});
