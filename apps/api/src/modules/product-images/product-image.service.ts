import type { Database } from "@order-platform/database";

import {
  type ProductImageStorage,
  type ProductImageUploadRequest,
} from "../../storage/product-image.js";
import {
  findCurrentProductImage,
  productExists,
  ProductForImageNotFoundError,
  replaceCurrentProductImage,
} from "./product-image.repository.js";
import type { ConfirmProductImageUploadInput } from "./product-image.schemas.js";

export const maximumProductImageBytes = 5 * 1024 * 1024;

export class ProductImageNotFoundError extends Error {}
export class ProductImageUploadNotVerifiedError extends Error {}

type ServiceDependencies = {
  database: Database;
  storage: ProductImageStorage;
  repository?: {
    productExists(productId: string): ReturnType<typeof productExists>;
    findCurrent(productId: string): ReturnType<typeof findCurrentProductImage>;
    replace(
      input: Parameters<typeof replaceCurrentProductImage>[1],
    ): ReturnType<typeof replaceCurrentProductImage>;
  };
  onCleanupFailure?: (error: unknown, objectKey: string) => void;
};

function resolveRepository(dependencies: ServiceDependencies) {
  return (
    dependencies.repository ?? {
      productExists: (productId: string) =>
        productExists(dependencies.database, productId),
      findCurrent: (productId: string) =>
        findCurrentProductImage(dependencies.database, productId),
      replace: (input: Parameters<typeof replaceCurrentProductImage>[1]) =>
        replaceCurrentProductImage(dependencies.database, input),
    }
  );
}

async function discardRejectedUpload(
  dependencies: ServiceDependencies,
  objectKey: string,
) {
  try {
    await dependencies.storage.deleteObject(objectKey);
  } catch (error) {
    dependencies.onCleanupFailure?.(error, objectKey);
  }
}

export async function requestProductImageUpload(
  dependencies: ServiceDependencies,
  request: ProductImageUploadRequest,
) {
  const repository = resolveRepository(dependencies);
  if (!(await repository.productExists(request.productId))) {
    throw new ProductForImageNotFoundError("Product not found");
  }
  return dependencies.storage.createUploadGrant(request);
}

export async function confirmProductImageUpload(
  dependencies: ServiceDependencies,
  productId: string,
  input: ConfirmProductImageUploadInput,
) {
  const expectedPrefix = `products/${productId.toLowerCase()}/`;
  if (!input.objectKey.startsWith(expectedPrefix)) {
    throw new ProductImageUploadNotVerifiedError(
      "Object key does not belong to this product",
    );
  }

  const stored = await dependencies.storage.inspectObject(input.objectKey);
  if (
    stored.contentType !== input.contentType ||
    stored.checksumSha256 !== input.checksumSha256
  ) {
    await discardRejectedUpload(dependencies, input.objectKey);
    throw new ProductImageUploadNotVerifiedError(
      "Stored object metadata does not match the upload request",
    );
  }
  if (stored.byteSize < 1 || stored.byteSize > maximumProductImageBytes) {
    await discardRejectedUpload(dependencies, input.objectKey);
    throw new ProductImageUploadNotVerifiedError(
      `Product images must be between 1 and ${maximumProductImageBytes} bytes`,
    );
  }

  const result = await resolveRepository(dependencies).replace({
    productId,
    objectKey: input.objectKey,
    contentType: input.contentType,
    checksumSha256: input.checksumSha256,
    byteSize: stored.byteSize,
  });

  if (
    result.previousObjectKey &&
    result.previousObjectKey !== result.image.objectKey
  ) {
    try {
      await dependencies.storage.deleteObject(result.previousObjectKey);
    } catch (error) {
      dependencies.onCleanupFailure?.(error, result.previousObjectKey);
    }
  }

  return result.image;
}

export async function requestProductImageDownload(
  dependencies: ServiceDependencies,
  productId: string,
) {
  const repository = resolveRepository(dependencies);
  const image = await repository.findCurrent(productId);
  if (!image) {
    if (!(await repository.productExists(productId))) {
      throw new ProductForImageNotFoundError("Product not found");
    }
    throw new ProductImageNotFoundError("Product image not found");
  }

  const grant = await dependencies.storage.createDownloadGrant(image.objectKey);
  return { image, grant };
}
