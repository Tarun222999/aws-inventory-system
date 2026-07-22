import assert from "node:assert/strict";
import { after, test } from "node:test";

import { eq, inArray } from "drizzle-orm";

import { createDatabase, products } from "@order-platform/database";

import { decodeProductCursor, encodeProductCursor } from "./product.cursor.js";
import {
  createProduct,
  DuplicateSkuError,
  findProductById,
  listProducts,
} from "./product.repository.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl)
  throw new Error("DATABASE_URL is required for integration tests");

const connection = createDatabase(databaseUrl, {
  onPoolError: (error) => console.error(error),
});

after(async () => connection.close());

function testSku(label: string) {
  return `TEST-${label}-${crypto.randomUUID()}`;
}

void test("creates a product and inventory atomically", async () => {
  const product = await createProduct(connection.database, {
    sku: testSku("CREATE"),
    name: "Integration product",
    description: null,
    pricePaise: 12_500,
    initialQuantity: 7,
  });

  try {
    const stored = await findProductById(connection.database, product.id);
    assert.equal(stored?.availableQuantity, 7);
    assert.equal(stored?.pricePaise, 12_500);
  } finally {
    await connection.database
      .delete(products)
      .where(eq(products.id, product.id));
  }
});

void test("rejects a duplicate SKU", async () => {
  const sku = testSku("DUPLICATE");
  const first = await createProduct(connection.database, {
    sku,
    name: "Original",
    pricePaise: 1_000,
    initialQuantity: 1,
  });

  try {
    await assert.rejects(
      createProduct(connection.database, {
        sku,
        name: "Duplicate",
        pricePaise: 2_000,
        initialQuantity: 2,
      }),
      DuplicateSkuError,
    );
  } finally {
    await connection.database.delete(products).where(eq(products.id, first.id));
  }
});

void test("walks product pages without returning the cursor row again", async () => {
  const created = [];
  for (let index = 0; index < 3; index += 1) {
    created.push(
      await createProduct(connection.database, {
        sku: testSku(`PAGE-${index}`),
        name: `Page product ${index}`,
        pricePaise: 1_000 + index,
        initialQuantity: index,
      }),
    );
  }

  try {
    const createdIds = new Set(created.map((product) => product.id));
    const allRows = await listProducts(connection.database, 100);
    const relevantRows = allRows.filter((row) => createdIds.has(row.id));
    assert.equal(relevantRows.length, 3);

    const first = relevantRows[0];
    assert.ok(first);
    const cursor = decodeProductCursor(
      encodeProductCursor({
        createdAt: first.createdAt.toISOString(),
        id: first.id,
      }),
    );
    const laterRows = await listProducts(connection.database, 100, cursor);
    const laterCreatedIds = laterRows
      .filter((row) => createdIds.has(row.id))
      .map((row) => row.id);

    assert.equal(laterCreatedIds.includes(first.id), false);
    assert.equal(laterCreatedIds.length, 2);
  } finally {
    await connection.database.delete(products).where(
      inArray(
        products.id,
        created.map((product) => product.id),
      ),
    );
  }
});
