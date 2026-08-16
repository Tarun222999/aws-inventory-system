import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";

import type { Database } from "@order-platform/database";

import type {
  ProductImageStorage,
  ProductImageUploadGrant,
} from "../../storage/product-image.js";
import { ProductForImageNotFoundError } from "./product-image.repository.js";
import {
  confirmProductImageUpload,
  maximumProductImageBytes,
  ProductImageNotFoundError,
  ProductImageUploadNotVerifiedError,
  requestProductImageDownload,
  requestProductImageUpload,
} from "./product-image.service.js";

const productId = "11111111-1111-4111-8111-111111111111";
const imageId = "22222222-2222-4222-8222-222222222222";
const objectKey = `products/${productId}/${imageId}.png`;
const checksumSha256 = createHash("sha256")
  .update("demo-image-bytes")
  .digest("base64");
const uploadGrant: ProductImageUploadGrant = {
  objectKey,
  url: "https://example.invalid/upload",
  expiresInSeconds: 60,
  requiredHeaders: {
    "content-type": "image/png",
    "x-amz-checksum-sha256": checksumSha256,
    "if-none-match": "*",
  },
};

function createDependencies(
  options: {
    exists?: boolean;
    current?: StoredImage;
    previousObjectKey?: string;
    inspectedContentType?: string;
    inspectedChecksum?: string;
    inspectedByteSize?: number;
  } = {},
) {
  const deleted: string[] = [];
  const storedImage = options.current;
  const replacement = {
    id: "33333333-3333-4333-8333-333333333333",
    productId,
    objectKey,
    contentType: "image/png",
    checksumSha256,
    byteSize: options.inspectedByteSize ?? 16,
    createdAt: new Date("2026-08-16T00:00:00.000Z"),
    updatedAt: new Date("2026-08-16T00:00:00.000Z"),
  };
  const storage: ProductImageStorage = {
    createUploadGrant: () => Promise.resolve(uploadGrant),
    createDownloadGrant: () =>
      Promise.resolve({
        url: "https://example.invalid/download",
        expiresInSeconds: 60,
      }),
    inspectObject: () =>
      Promise.resolve({
        contentType: options.inspectedContentType ?? "image/png",
        checksumSha256: options.inspectedChecksum ?? checksumSha256,
        byteSize: options.inspectedByteSize ?? 16,
      }),
    deleteObject: (key) => {
      deleted.push(key);
      return Promise.resolve();
    },
  };
  const repository = {
    productExists: () => Promise.resolve(options.exists ?? true),
    findCurrent: () => Promise.resolve(storedImage),
    replace: () =>
      Promise.resolve({
        image: replacement,
        previousObjectKey: options.previousObjectKey,
      }),
  };

  return {
    dependencies: {
      database: undefined as unknown as Database,
      storage,
      repository,
    },
    deleted,
    replacement,
  };
}

type StoredImage = {
  id: string;
  productId: string;
  objectKey: string;
  contentType: string;
  checksumSha256: string;
  byteSize: number;
  createdAt: Date;
  updatedAt: Date;
};

void test("issues an upload grant only for an existing product", async () => {
  const existing = createDependencies();
  assert.deepEqual(
    await requestProductImageUpload(existing.dependencies, {
      productId,
      contentType: "image/png",
      checksumSha256,
    }),
    uploadGrant,
  );

  const missing = createDependencies({ exists: false });
  await assert.rejects(
    requestProductImageUpload(missing.dependencies, {
      productId,
      contentType: "image/png",
      checksumSha256,
    }),
    ProductForImageNotFoundError,
  );
});

void test("confirms S3 metadata before replacing database metadata", async () => {
  const previousObjectKey = `products/${productId}/44444444-4444-4444-8444-444444444444.png`;
  const context = createDependencies({ previousObjectKey });

  const image = await confirmProductImageUpload(
    context.dependencies,
    productId,
    { objectKey, contentType: "image/png", checksumSha256 },
  );

  assert.deepEqual(image, context.replacement);
  assert.deepEqual(context.deleted, [previousObjectKey]);
});

void test("rejects mismatched, cross-product, and oversized uploads", async () => {
  const mismatch = createDependencies({
    inspectedContentType: "image/webp",
  });
  await assert.rejects(
    confirmProductImageUpload(mismatch.dependencies, productId, {
      objectKey,
      contentType: "image/png",
      checksumSha256,
    }),
    ProductImageUploadNotVerifiedError,
  );
  assert.deepEqual(mismatch.deleted, [objectKey]);

  const oversized = createDependencies({
    inspectedByteSize: maximumProductImageBytes + 1,
  });
  await assert.rejects(
    confirmProductImageUpload(oversized.dependencies, productId, {
      objectKey,
      contentType: "image/png",
      checksumSha256,
    }),
    ProductImageUploadNotVerifiedError,
  );
  assert.deepEqual(oversized.deleted, [objectKey]);

  const otherProductKey = objectKey.replace(productId, crypto.randomUUID());
  await assert.rejects(
    confirmProductImageUpload(createDependencies().dependencies, productId, {
      objectKey: otherProductKey,
      contentType: "image/png",
      checksumSha256,
    }),
    ProductImageUploadNotVerifiedError,
  );
});

void test("returns a short-lived download grant for persisted image metadata", async () => {
  const current = createDependencies().replacement;
  const context = createDependencies({ current });
  const result = await requestProductImageDownload(
    context.dependencies,
    productId,
  );

  assert.equal(result.image.objectKey, objectKey);
  assert.equal(result.grant.expiresInSeconds, 60);

  await assert.rejects(
    requestProductImageDownload(
      createDependencies({ exists: true }).dependencies,
      productId,
    ),
    ProductImageNotFoundError,
  );
});
