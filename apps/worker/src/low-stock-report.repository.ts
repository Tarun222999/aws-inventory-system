import { asc, eq, lte } from "drizzle-orm";

import { inventory, products, type Database } from "@order-platform/database";

import type { LowStockItem } from "./low-stock-report.js";

export async function listLowStockItems(
  database: Database,
  threshold: number,
): Promise<LowStockItem[]> {
  if (!Number.isInteger(threshold) || threshold < 0) {
    throw new Error("Low-stock threshold must be a non-negative integer");
  }

  return database
    .select({
      productId: products.id,
      sku: products.sku,
      name: products.name,
      availableQuantity: inventory.availableQuantity,
    })
    .from(inventory)
    .innerJoin(products, eq(products.id, inventory.productId))
    .where(lte(inventory.availableQuantity, threshold))
    .orderBy(asc(products.sku), asc(products.id));
}
