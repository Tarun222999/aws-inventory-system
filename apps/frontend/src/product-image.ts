import {
  confirmProductImageUpload,
  requestProductImageUploadGrant,
  uploadProductImageBytes,
} from "./api";
import type {
  ProductImageContentType,
  ProductImageUploadConfirmation,
} from "./types";

export const maximumProductImageBytes = 5 * 1024 * 1024;
export const acceptedProductImageTypes: readonly ProductImageContentType[] = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

export class InvalidProductImageError extends Error {}

export function validateProductImage(file: File): asserts file is File & {
  type: ProductImageContentType;
} {
  if (
    !acceptedProductImageTypes.includes(file.type as ProductImageContentType)
  ) {
    throw new InvalidProductImageError(
      "Choose a JPEG, PNG, or WebP product image.",
    );
  }
  if (file.size < 1 || file.size > maximumProductImageBytes) {
    throw new InvalidProductImageError(
      "Product images must be between 1 byte and 5 MiB.",
    );
  }
}

export async function sha256Checksum(file: File) {
  const digest = new Uint8Array(
    await crypto.subtle.digest("SHA-256", await file.arrayBuffer()),
  );
  return btoa(String.fromCharCode(...digest));
}

export async function uploadProductImage(productId: string, file: File) {
  validateProductImage(file);
  const checksumSha256 = await sha256Checksum(file);
  const grant = await requestProductImageUploadGrant(productId, {
    contentType: file.type,
    checksumSha256,
  });
  await uploadProductImageBytes(grant.data, file);

  const confirmation: ProductImageUploadConfirmation = {
    objectKey: grant.data.objectKey,
    contentType: file.type,
    checksumSha256,
  };
  return confirmation;
}

export function confirmUploadedProductImage(
  productId: string,
  confirmation: ProductImageUploadConfirmation,
) {
  return confirmProductImageUpload(productId, confirmation);
}
