import { createHash } from "node:crypto";

import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import type {
  StoreReportInput,
  StoreReportOutcome,
} from "./low-stock-report.service.js";

export type LowStockReportStorageConfig = {
  bucketName: string;
  region: string;
  downloadExpiresInSeconds?: number;
};

export type LowStockReportStorageDependencies = {
  sendPutCommand?: (command: PutObjectCommand) => Promise<unknown>;

  signGetCommand?: (
    command: GetObjectCommand,
    expiresInSeconds: number,
  ) => Promise<string>;
};

function isPreconditionFailed(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  if ("name" in error && error.name === "PreconditionFailed") {
    return true;
  }

  if (!("$metadata" in error)) {
    return false;
  }

  const metadata = error.$metadata;

  return (
    typeof metadata === "object" &&
    metadata !== null &&
    "httpStatusCode" in metadata &&
    metadata.httpStatusCode === 412
  );
}

export function createLowStockReportStorage(
  config: LowStockReportStorageConfig,
  dependencies: LowStockReportStorageDependencies = {},
) {
  const bucketName = config.bucketName.trim();
  const region = config.region.trim();
  const downloadExpiresInSeconds = config.downloadExpiresInSeconds ?? 300;

  if (!bucketName) {
    throw new Error("Report bucket name is required");
  }

  if (!region) {
    throw new Error("Report AWS Region is required");
  }

  if (
    !Number.isInteger(downloadExpiresInSeconds) ||
    downloadExpiresInSeconds < 30 ||
    downloadExpiresInSeconds > 900
  ) {
    throw new Error(
      "Report download expiry must be between 30 and 900 seconds",
    );
  }

  const client = new S3Client({ region });

  const sendPutCommand =
    dependencies.sendPutCommand ??
    ((command: PutObjectCommand) => client.send(command));

  const signGetCommand =
    dependencies.signGetCommand ??
    ((command: GetObjectCommand, expiresInSeconds: number) =>
      getSignedUrl(client, command, {
        expiresIn: expiresInSeconds,
      }));

  return {
    async storeReport(input: StoreReportInput): Promise<StoreReportOutcome> {
      const checksum = createHash("sha256")
        .update(input.body, "utf8")
        .digest("base64");

      try {
        await sendPutCommand(
          new PutObjectCommand({
            Bucket: bucketName,
            Key: input.objectKey,
            Body: input.body,
            ContentType: input.contentType,
            ChecksumSHA256: checksum,
            IfNoneMatch: "*",
          }),
        );

        return "created";
      } catch (error) {
        if (isPreconditionFailed(error)) {
          return "already-exists";
        }

        throw error;
      }
    },

    createDownloadUrl(objectKey: string): Promise<string> {
      if (!objectKey.startsWith("reports/low-stock/")) {
        throw new Error("Invalid low-stock report object key");
      }

      return signGetCommand(
        new GetObjectCommand({
          Bucket: bucketName,
          Key: objectKey,
        }),
        downloadExpiresInSeconds,
      );
    },
  };
}
