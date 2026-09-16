import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";

import { inArray } from "drizzle-orm";

import {
  createDatabase,
  inventory,
  products,
} from "@order-platform/database";

import { listLowStockItems } from "./low-stock-report.repository.js";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is required for integration tests",
  );
}

const connection = createDatabase(databaseUrl, {
  applicationName: "order-platform-low-stock-report-test",
  maxConnections: 1,
  onPoolError: (error) => console.error(error),
});

after(async () => connection.close());

void test("returns only products at or below the stock threshold", async () => {
  const suffix = randomUUID()
    .slice(0, 8)
    .toUpperCase();

  const outOfStockId = randomUUID();
  const atThresholdId = randomUUID();
  const healthyStockId = randomUUID();

  const productIds: string[]  = [
    outOfStockId,
    atThresholdId,
    healthyStockId,
  ];

  const outOfStockSku = `TEST-A-OUT-${suffix}`;
  const atThresholdSku = `TEST-B-LIMIT-${suffix}`;
  const healthyStockSku = `TEST-C-HEALTHY-${suffix}`;

  try {
    await connection.database.insert(products).values([
      {
        id: outOfStockId,
        sku: outOfStockSku,
        name: "Out-of-stock test product",
        pricePaise: 1_000,
      },
      {
        id: atThresholdId,
        sku: atThresholdSku,
        name: "At-threshold test product",
        pricePaise: 2_000,
      },
      {
        id: healthyStockId,
        sku: healthyStockSku,
        name: "Healthy-stock test product",
        pricePaise: 3_000,
      },
    ]);

    await connection.database.insert(inventory).values([
      {
        productId: outOfStockId,
        availableQuantity: 0,
      },
      {
        productId: atThresholdId,
        availableQuantity: 5,
      },
      {
        productId: healthyStockId,
        availableQuantity: 6,
      },
    ]);

    const result = await listLowStockItems(
      connection.database,
      5,
    );

    const testRows = result.filter((item) =>
      productIds.includes(item.productId),
    );

    assert.deepEqual(
      testRows.map((item) => ({
        sku: item.sku,
        availableQuantity: item.availableQuantity,
      })),
      [
        {
          sku: outOfStockSku,
          availableQuantity: 0,
        },
        {
          sku: atThresholdSku,
          availableQuantity: 5,
        },
      ],
    );

    assert.equal(
      testRows.some(
        (item) => item.productId === healthyStockId,
      ),
      false,
    );
  } finally {
    await connection.database
      .delete(products)
      .where(inArray(products.id, productIds));
  }
});