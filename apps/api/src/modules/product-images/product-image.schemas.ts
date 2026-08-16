import { z } from "zod";

import { productImageContentTypes } from "../../storage/product-image.js";

export const productImageProductIdSchema = z.string().uuid();

export const createProductImageUploadGrantSchema = z
  .object({
    contentType: z.enum(productImageContentTypes),
    checksumSha256: z.string().refine(
      (value) => {
        const decoded = Buffer.from(value, "base64");
        return decoded.length === 32 && decoded.toString("base64") === value;
      },
      { message: "Must be a base64-encoded SHA-256 checksum" },
    ),
  })
  .strict();

export const confirmProductImageUploadSchema = z
  .object({
    objectKey: z.string().min(1).max(1_024),
    contentType: z.enum(productImageContentTypes),
    checksumSha256: z.string().refine(
      (value) => {
        const decoded = Buffer.from(value, "base64");
        return decoded.length === 32 && decoded.toString("base64") === value;
      },
      { message: "Must be a base64-encoded SHA-256 checksum" },
    ),
  })
  .strict();

export type ConfirmProductImageUploadInput = z.infer<
  typeof confirmProductImageUploadSchema
>;
