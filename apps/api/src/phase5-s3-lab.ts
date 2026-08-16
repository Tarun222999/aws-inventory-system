import assert from "node:assert/strict";
import { createHash } from "node:crypto";

import { createProductImageStorage } from "./storage/product-image.js";

function requiredEnvironment(
  name: "AWS_REGION" | "PRODUCT_IMAGE_BUCKET",
): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}

function removeSignature(presignedUrl: string): string {
  const url = new URL(presignedUrl);
  url.search = "";
  return url.toString();
}

const productId = "11111111-1111-4111-8111-111111111111";

const demoPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zt9sAAAAASUVORK5CYII=",
  "base64",
);

const checksumSha256 = createHash("sha256").update(demoPng).digest("base64");

assert.equal(
  demoPng.subarray(0, 8).toString("hex"),
  "89504e470d0a1a0a",
  "Demo bytes must contain a PNG signature",
);

type SafeError = {
  name: string;
  code?: string;
};

function safeError(error: unknown): SafeError {
  if (typeof error !== "object" || error === null) {
    return { name: "unknown" };
  }

  const candidate = error as { name?: unknown; code?: unknown };
  const result: SafeError = {
    name: typeof candidate.name === "string" ? candidate.name : "unknown",
  };

  if (typeof candidate.code === "string") {
    result.code = candidate.code;
  }

  return result;
}

let stage = "startup";

async function main() {
  const region = requiredEnvironment("AWS_REGION");
  const bucketName = requiredEnvironment("PRODUCT_IMAGE_BUCKET");

  const storage = createProductImageStorage({
    bucketName,
    region,
    uploadExpiresInSeconds: 60,
    downloadExpiresInSeconds: 60,
  });

  let objectKey: string | undefined;
  let proofCompleted = false;

  try {
    stage = "create-upload-grant";

    const uploadGrant = await storage.createUploadGrant({
      productId,
      contentType: "image/png",
      checksumSha256,
    });

    objectKey = uploadGrant.objectKey;

    stage = "unsigned-upload-denial";

    const unsignedUpload = await fetch(removeSignature(uploadGrant.url), {
      method: "PUT",
      headers: {
        "content-type": uploadGrant.requiredHeaders["content-type"],
      },
      body: demoPng,
    });

    console.log("phase5.s3.unsigned-upload", {
      denied: unsignedUpload.status === 403,
      status: unsignedUpload.status,
    });
    assert.equal(unsignedUpload.status, 403);

    stage = "signed-upload";

    const signedUpload = await fetch(uploadGrant.url, {
      method: "PUT",
      headers: uploadGrant.requiredHeaders,
      body: demoPng,
    });

    assert.equal(signedUpload.status, 200);
    console.log("phase5.s3.signed-upload", {
      uploaded: true,
      status: signedUpload.status,
    });

    stage = "overwrite-denial";

    const overwriteAttempt = await fetch(uploadGrant.url, {
      method: "PUT",
      headers: uploadGrant.requiredHeaders,
      body: demoPng,
    });

    assert.equal(overwriteAttempt.status, 412);
    console.log("phase5.s3.overwrite", {
      denied: true,
      status: overwriteAttempt.status,
    });

    stage = "create-download-grant";

    const downloadGrant = await storage.createDownloadGrant(objectKey);

    stage = "unsigned-download-denial";

    const unsignedDownload = await fetch(removeSignature(downloadGrant.url));

    console.log("phase5.s3.unsigned-download", {
      denied: unsignedDownload.status === 403,
      status: unsignedDownload.status,
    });
    assert.equal(unsignedDownload.status, 403);

    stage = "signed-download";

    const signedDownload = await fetch(downloadGrant.url);

    assert.equal(signedDownload.status, 200);
    assert.equal(signedDownload.headers.get("content-type"), "image/png");

    const downloadedBytes = Buffer.from(await signedDownload.arrayBuffer());

    assert.deepEqual(downloadedBytes, demoPng);
    console.log("phase5.s3.signed-download", {
      downloaded: true,
      bytesMatch: true,
      contentTypeMatches: true,
      status: signedDownload.status,
    });

    proofCompleted = true;
  } finally {
    if (objectKey) {
      const stageBeforeCleanup = stage;

      stage = "cleanup";
      await storage.deleteObject(objectKey);
      console.log("phase5.s3.cleanup", {
        deleteRequested: true,
      });

      if (!proofCompleted) {
        stage = stageBeforeCleanup;
      }
    }
  }

  assert.equal(proofCompleted, true);

  stage = "complete";
  console.log("phase5.s3", {
    completed: true,
    bucketPublic: false,
    presignedUrlsLogged: false,
    objectKeyLogged: false,
  });
}

void main().catch((error: unknown) => {
  console.error("phase5.s3", {
    completed: false,
    error: safeError(error),
    stage,
  });
  process.exitCode = 1;
});
