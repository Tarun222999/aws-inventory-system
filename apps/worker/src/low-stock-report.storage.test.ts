import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";

import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";

import { createLowStockReportStorage } from "./low-stock-report.storage.js";

const reportInput = {
  objectKey: "reports/low-stock/2026-09-14.json",
  body: '{"itemCount":1}\n',
  contentType: "application/json" as const,
};

void test("conditionally creates a report in S3", async () => {
  const commands: PutObjectCommand[] = [];

  const storage = createLowStockReportStorage(
    {
      bucketName: "report-bucket",
      region: "ap-south-1",
    },
    {
      sendPutCommand(command) {
        commands.push(command);
        return Promise.resolve({});
      },
    },
  );

  const outcome = await storage.storeReport(reportInput);

  assert.equal(outcome, "created");
  assert.equal(commands.length, 1);

  const input = commands[0]?.input;
  const expectedChecksum = createHash("sha256")
    .update(reportInput.body, "utf8")
    .digest("base64");

  assert.equal(input?.Bucket, "report-bucket");
  assert.equal(input?.Key, reportInput.objectKey);
  assert.equal(input?.Body, reportInput.body);
  assert.equal(input?.ContentType, "application/json");
  assert.equal(input?.ChecksumSHA256, expectedChecksum);
  assert.equal(input?.IfNoneMatch, "*");
});

void test("treats an S3 precondition failure as an existing report", async () => {
  const storage = createLowStockReportStorage(
    {
      bucketName: "report-bucket",
      region: "ap-south-1",
    },
    {
      sendPutCommand() {
        const error = Object.assign(new Error("The report already exists"), {
          $metadata: {
            httpStatusCode: 412,
          },
        });

        error.name = "PreconditionFailed";

        return Promise.reject(error);
      },
    },
  );

  const outcome = await storage.storeReport(reportInput);

  assert.equal(outcome, "already-exists");
});

void test("does not hide unexpected S3 failures", async () => {
  const expectedError = new Error("S3 unavailable");

  const storage = createLowStockReportStorage(
    {
      bucketName: "report-bucket",
      region: "ap-south-1",
    },
    {
      sendPutCommand() {
        return Promise.reject(expectedError);
      },
    },
  );

  await assert.rejects(
    storage.storeReport(reportInput),
    (error) => error === expectedError,
  );
});

void test("creates a short-lived download URL for the report", async () => {
  const signedCommands: GetObjectCommand[] = [];
  const expiryValues: number[] = [];

  const storage = createLowStockReportStorage(
    {
      bucketName: "report-bucket",
      region: "ap-south-1",
      downloadExpiresInSeconds: 300,
    },
    {
      signGetCommand(command, expiresInSeconds) {
        signedCommands.push(command);
        expiryValues.push(expiresInSeconds);

        return Promise.resolve("https://example.com/temporary-report-link");
      },
    },
  );

  const url = await storage.createDownloadUrl(reportInput.objectKey);

  assert.equal(url, "https://example.com/temporary-report-link");
  assert.equal(signedCommands[0]?.input.Bucket, "report-bucket");
  assert.equal(signedCommands[0]?.input.Key, reportInput.objectKey);
  assert.deepEqual(expiryValues, [300]);

  assert.throws(
    () => storage.createDownloadUrl("products/not-a-report.json"),
    /Invalid low-stock report object key/,
  );
});
