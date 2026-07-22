import { and, asc, eq, gt, or } from "drizzle-orm";

import { inventory, products, type Database } from "@order-platform/database";

import type { ProductCursor } from "./product.cursor.js";
import type { CreateProductInput } from "./product.schemas.js";

export class DuplicateSkuError extends Error {}

function isUniqueViolation(error: unknown): boolean {
  let current = error;
  for (let depth = 0; depth < 5; depth += 1) {
    if (typeof current !== "object" || current === null) return false;
    if ("code" in current && current.code === "23505") return true;
    current = "cause" in current ? current.cause : undefined;
  }
  return false;
}

export async function createProduct(
  database: Database,
  input: CreateProductInput,
) {
  try {
    return await database.transaction(async (transaction) => {
      const [product] = await transaction
        .insert(products)
        .values({
          sku: input.sku,
          name: input.name,
          description: input.description ?? null,
          pricePaise: input.pricePaise,
        })
        .returning();

      if (!product) throw new Error("Product insert returned no row");

      const [stock] = await transaction
        .insert(inventory)
        .values({
          productId: product.id,
          availableQuantity: input.initialQuantity,
        })
        .returning();

      if (!stock) throw new Error("Inventory insert returned no row");
      return { ...product, availableQuantity: stock.availableQuantity };
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new DuplicateSkuError(`SKU ${input.sku} already exists`);
    }
    throw error;
  }
}

const productSelection = {
  id: products.id,
  sku: products.sku,
  name: products.name,
  description: products.description,
  pricePaise: products.pricePaise,
  availableQuantity: inventory.availableQuantity,
  createdAt: products.createdAt,
  updatedAt: products.updatedAt,
};

export async function findProductById(database: Database, id: string) {
  const [product] = await database
    .select(productSelection)
    .from(products)
    .innerJoin(inventory, eq(inventory.productId, products.id))
    .where(eq(products.id, id))
    .limit(1);
  return product;
}

export async function listProducts(
  database: Database,
  limit: number,
  cursor?: ProductCursor,
) {
  const cursorCondition = cursor
    ? or(
        gt(products.createdAt, new Date(cursor.createdAt)),
        and(
          eq(products.createdAt, new Date(cursor.createdAt)),
          gt(products.id, cursor.id),
        ),
      )
    : undefined;

  return database
    .select(productSelection)
    .from(products)
    .innerJoin(inventory, eq(inventory.productId, products.id))
    .where(cursorCondition)
    .orderBy(asc(products.createdAt), asc(products.id))
    .limit(limit + 1);
}
