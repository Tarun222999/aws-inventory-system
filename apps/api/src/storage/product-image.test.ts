import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";

import { S3Client } from "@aws-sdk/client-s3";

import {
  createProductImageStorage,
  type ProductImageContentType,
  type ProductImageStorageConfig,
} from "./product-image.js";

const productId = "11111111-1111-4111-8111-111111111111";
const imageId = "22222222-2222-4222-8222-222222222222";
const validObjectKey = `products/${productId}/${imageId}.png`;
const validChecksum = createHash("sha256")
  .update("demo-image-bytes")
  .digest("base64");

function createTestStorage(overrides: Partial<ProductImageStorageConfig> = {}) {
  const client = new S3Client({
    region: "ap-south-1",
    credentials: {
      accessKeyId: "TESTACCESSKEY",
      secretAccessKey: "test-secret-key-that-is-not-real",
    },
  });

  return createProductImageStorage(
    {
      bucketName: "order-platform-test-images",
      region: "ap-south-1",
      ...overrides,
    },
    { client },
  );
}

test("creates a narrow presigned product-image upload grant locally", async () => {
  const storage = createTestStorage();
  const grant = await storage.createUploadGrant({
    productId,
    contentType: "image/png",
    checksumSha256: validChecksum,
  });

  assert.match(
    grant.objectKey,
    new RegExp(`^products/${productId}/[0-9a-f-]{36}\\.png$`),
  );
  assert.equal(grant.expiresInSeconds, 60);
  assert.deepEqual(grant.requiredHeaders, {
    "content-type": "image/png",
    "x-amz-checksum-sha256": validChecksum,
    "if-none-match": "*",
  });

  const url = new URL(grant.url);
  assert.equal(url.protocol, "https:");
  assert.equal(url.searchParams.get("X-Amz-Expires"), "60");
  assert.ok(url.searchParams.get("X-Amz-Signature"));
  assert.equal(url.searchParams.has("x-amz-checksum-sha256"), false);

  const signedHeaders = url.searchParams.get("X-Amz-SignedHeaders") ?? "";
  assert.match(signedHeaders, /content-type/);
  assert.match(signedHeaders, /if-none-match/);
  assert.match(signedHeaders, /x-amz-checksum-sha256/);
});

test("creates a private GET grant for a canonical stored key", async () => {
  const storage = createTestStorage({ downloadExpiresInSeconds: 120 });
  const grant = await storage.createDownloadGrant(validObjectKey);

  assert.equal(grant.expiresInSeconds, 120);
  const url = new URL(grant.url);
  assert.equal(url.protocol, "https:");
  assert.equal(url.searchParams.get("X-Amz-Expires"), "120");
  assert.ok(url.searchParams.get("X-Amz-Signature"));
});

test("rejects unsafe expiry configuration", () => {
  assert.throws(
    () => createTestStorage({ uploadExpiresInSeconds: 29 }),
    /upload URL expiry must be an integer from 30 to 300 seconds/,
  );
  assert.throws(
    () => createTestStorage({ downloadExpiresInSeconds: 301 }),
    /download URL expiry must be an integer from 30 to 300 seconds/,
  );
  assert.throws(
    () => createTestStorage({ uploadExpiresInSeconds: 60.5 }),
    /upload URL expiry must be an integer from 30 to 300 seconds/,
  );
});

test("rejects missing bucket and Region configuration", () => {
  assert.throws(
    () => createTestStorage({ bucketName: " " }),
    /bucket name is required/,
  );
  assert.throws(
    () => createTestStorage({ region: " " }),
    /AWS Region is required/,
  );
});

test("rejects malformed product IDs, content types, and checksums", async () => {
  const storage = createTestStorage();

  await assert.rejects(
    storage.createUploadGrant({
      productId: "not-a-uuid",
      contentType: "image/png",
      checksumSha256: validChecksum,
    }),
    /Product ID must be a valid UUID/,
  );

  await assert.rejects(
    storage.createUploadGrant({
      productId,
      contentType: "image/gif" as ProductImageContentType,
      checksumSha256: validChecksum,
    }),
    /Unsupported product image content type/,
  );

  await assert.rejects(
    storage.createUploadGrant({
      productId,
      contentType: "image/png",
      checksumSha256: "not-a-sha256-checksum",
    }),
    /base64-encoded SHA-256/,
  );
});

test("rejects object keys outside the canonical product-image namespace", async () => {
  const storage = createTestStorage();

  await assert.rejects(
    storage.createDownloadGrant(`../${validObjectKey}`),
    /Invalid product image object key/,
  );
  await assert.rejects(
    storage.createDownloadGrant(
      "products/AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA/" +
        "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.png",
    ),
    /canonical lowercase/,
  );
  await assert.rejects(
    storage.deleteObject(`other/${productId}/${imageId}.png`),
    /Invalid product image object key/,
  );
});
