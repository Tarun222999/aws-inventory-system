import { randomUUID } from "node:crypto";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const productImageContentTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type ProductImageContentType = (typeof productImageContentTypes)[number];

const DEFAULT_UPLOAD_EXPIRES_IN_SECONDS = 60;
const DEFAULT_DOWNLOAD_EXPIRES_IN_SECONDS = 60;
const MAX_PRESIGNED_EXPIRES_IN_SECONDS = 300;

const extensionByContentType = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} satisfies Record<ProductImageContentType, string>;

export type ProductImageStorageConfig = {
  bucketName: string;
  region: string;
  uploadExpiresInSeconds?: number;
  downloadExpiresInSeconds?: number;
};

export type ProductImageStorageDependencies = {
  client?: S3Client;
};

function resolveExpiresInSeconds(
  configuredValue: number | undefined,
  defaultValue: number,
  operation: "upload" | "download",
) {
  const expiresInSeconds = configuredValue ?? defaultValue;

  if (
    !Number.isInteger(expiresInSeconds) ||
    expiresInSeconds < 30 ||
    expiresInSeconds > MAX_PRESIGNED_EXPIRES_IN_SECONDS
  ) {
    throw new Error(
      `${operation} URL expiry must be an integer from 30 to ${MAX_PRESIGNED_EXPIRES_IN_SECONDS} seconds`,
    );
  }

  return expiresInSeconds;
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function assertUuid(value: string, field: string) {
  if (!uuidPattern.test(value)) {
    throw new Error(`${field} must be a valid UUID`);
  }
}

function assertProductImageContentType(
  value: string,
): asserts value is ProductImageContentType {
  if (!productImageContentTypes.includes(value as ProductImageContentType)) {
    throw new Error("Unsupported product image content type");
  }
}

function createProductImageObjectKey(
  productId: string,
  contentType: ProductImageContentType,
) {
  assertUuid(productId, "Product ID");
  assertProductImageContentType(contentType);

  const extension = extensionByContentType[contentType];
  const imageId = randomUUID();

  return `products/${productId.toLowerCase()}/${imageId}.${extension}`;
}

function assertSha256Checksum(value: string) {
  const decoded = Buffer.from(value, "base64");

  if (decoded.length !== 32 || decoded.toString("base64") !== value) {
    throw new Error("Image checksum must be a base64-encoded SHA-256 value");
  }
}

function assertProductImageObjectKey(objectKey: string) {
  const [prefix, productId, filename, extraSegment] = objectKey.split("/");

  if (
    prefix !== "products" ||
    !productId ||
    !filename ||
    extraSegment !== undefined
  ) {
    throw new Error("Invalid product image object key");
  }

  const [imageId, extension, extraExtension] = filename.split(".");

  if (!imageId || !extension || extraExtension !== undefined) {
    throw new Error("Invalid product image filename");
  }

  assertUuid(productId, "Object key product ID");
  assertUuid(imageId, "Object key image ID");

  if (!Object.values(extensionByContentType).includes(extension)) {
    throw new Error("Invalid product image extension");
  }

  if (objectKey !== objectKey.toLowerCase()) {
    throw new Error("Product image object key must use canonical lowercase");
  }
}
export type ProductImageUploadRequest = {
  productId: string;
  contentType: ProductImageContentType;
  checksumSha256: string;
};

export type ProductImageUploadGrant = {
  objectKey: string;
  url: string;
  expiresInSeconds: number;
  requiredHeaders: {
    "content-type": ProductImageContentType;
    "x-amz-checksum-sha256": string;
    "if-none-match": "*";
  };
};

export type ProductImageDownloadGrant = {
  url: string;
  expiresInSeconds: number;
};

export type ProductImageStorage = {
  createUploadGrant(
    request: ProductImageUploadRequest,
  ): Promise<ProductImageUploadGrant>;
  createDownloadGrant(objectKey: string): Promise<ProductImageDownloadGrant>;
  deleteObject(objectKey: string): Promise<void>;
};

export function createProductImageStorage(
  config: ProductImageStorageConfig,
  dependencies: ProductImageStorageDependencies = {},
): ProductImageStorage {
  const bucketName = config.bucketName.trim();
  const region = config.region.trim();

  if (!bucketName) {
    throw new Error("Product image bucket name is required");
  }

  if (!region) {
    throw new Error("Product image AWS Region is required");
  }

  const uploadExpiresInSeconds = resolveExpiresInSeconds(
    config.uploadExpiresInSeconds,
    DEFAULT_UPLOAD_EXPIRES_IN_SECONDS,
    "upload",
  );

  const downloadExpiresInSeconds = resolveExpiresInSeconds(
    config.downloadExpiresInSeconds,
    DEFAULT_DOWNLOAD_EXPIRES_IN_SECONDS,
    "download",
  );

  const client = dependencies.client ?? new S3Client({ region });
  return {
    async createUploadGrant(request) {
      assertProductImageContentType(request.contentType);
      assertSha256Checksum(request.checksumSha256);

      const objectKey = createProductImageObjectKey(
        request.productId,
        request.contentType,
      );

      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: objectKey,
        ContentType: request.contentType,
        ChecksumSHA256: request.checksumSha256,
        IfNoneMatch: "*",
      });

      const url = await getSignedUrl(client, command, {
        expiresIn: uploadExpiresInSeconds,
        signableHeaders: new Set(["content-type", "if-none-match"]),
        unhoistableHeaders: new Set(["x-amz-checksum-sha256"]),
      });

      return {
        objectKey,
        url,
        expiresInSeconds: uploadExpiresInSeconds,
        requiredHeaders: {
          "content-type": request.contentType,
          "x-amz-checksum-sha256": request.checksumSha256,
          "if-none-match": "*",
        },
      };
    },

    async createDownloadGrant(objectKey) {
      assertProductImageObjectKey(objectKey);

      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: objectKey,
      });

      const url = await getSignedUrl(client, command, {
        expiresIn: downloadExpiresInSeconds,
      });

      return {
        url,
        expiresInSeconds: downloadExpiresInSeconds,
      };
    },

    async deleteObject(objectKey) {
      assertProductImageObjectKey(objectKey);

      await client.send(
        new DeleteObjectCommand({
          Bucket: bucketName,
          Key: objectKey,
        }),
      );
    },
  };
}
