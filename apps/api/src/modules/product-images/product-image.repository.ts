import { eq } from "drizzle-orm";

import {
  productImages,
  products,
  type Database,
} from "@order-platform/database";

import type { ProductImageContentType } from "../../storage/product-image.js";

export class ProductForImageNotFoundError extends Error {}

export type PersistedProductImageInput = {
  productId: string;
  objectKey: string;
  contentType: ProductImageContentType;
  checksumSha256: string;
  byteSize: number;
};

export async function productExists(database: Database, productId: string) {
  const [product] = await database
    .select({ id: products.id })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);
  return product !== undefined;
}

export async function findCurrentProductImage(
  database: Database,
  productId: string,
) {
  const [image] = await database
    .select()
    .from(productImages)
    .where(eq(productImages.productId, productId))
    .limit(1);
  return image;
}

export async function replaceCurrentProductImage(
  database: Database,
  input: PersistedProductImageInput,
) {
  return database.transaction(async (transaction) => {
    const [product] = await transaction
      .select({ id: products.id })
      .from(products)
      .where(eq(products.id, input.productId))
      .for("update")
      .limit(1);

    if (!product) {
      throw new ProductForImageNotFoundError("Product not found");
    }

    const [previous] = await transaction
      .select({ objectKey: productImages.objectKey })
      .from(productImages)
      .where(eq(productImages.productId, input.productId))
      .limit(1);

    const now = new Date();
    const [image] = await transaction
      .insert(productImages)
      .values(input)
      .onConflictDoUpdate({
        target: productImages.productId,
        set: {
          objectKey: input.objectKey,
          contentType: input.contentType,
          checksumSha256: input.checksumSha256,
          byteSize: input.byteSize,
          updatedAt: now,
        },
      })
      .returning();

    if (!image) throw new Error("Product image upsert returned no row");
    return { image, previousObjectKey: previous?.objectKey };
  });
}
