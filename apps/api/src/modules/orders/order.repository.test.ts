import assert from "node:assert/strict";
import { after, test } from "node:test";

import { count, eq, inArray } from "drizzle-orm";

import {
  createDatabase,
  inventory,
  jobs,
  orders,
  products,
} from "@order-platform/database";

import { createProduct } from "../products/product.repository.js";
import { createOrder, InsufficientStockError } from "./order.repository.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl)
  throw new Error("DATABASE_URL is required for integration tests");

const connection = createDatabase(databaseUrl, {
  onPoolError: (error) => console.error(error),
});

after(async () => connection.close());

async function makeProduct(quantity: number, label: string) {
  return createProduct(connection.database, {
    sku: `TEST-ORDER-${label}-${crypto.randomUUID()}`,
    name: `Order product ${label}`,
    pricePaise: 2_500,
    initialQuantity: quantity,
  });
}

void test("accepts an order, decrements stock, and records pending work", async () => {
  const product = await makeProduct(3, "SUCCESS");
  let orderId: string | undefined;

  try {
    const order = await createOrder(connection.database, {
      items: [{ productId: product.id, quantity: 2 }],
    });
    orderId = order.id;

    assert.equal(order.status, "pending");
    assert.equal(order.totalPaise, 5_000);
    assert.equal(order.items[0]?.unitPricePaise, 2_500);

    const [stock] = await connection.database
      .select()
      .from(inventory)
      .where(eq(inventory.productId, product.id));
    assert.equal(stock?.availableQuantity, 1);

    const [job] = await connection.database
      .select()
      .from(jobs)
      .where(eq(jobs.orderId, order.id));
    assert.equal(job?.status, "pending");
    assert.equal(job?.type, "fulfill_order");
  } finally {
    if (orderId) {
      await connection.database.delete(orders).where(eq(orders.id, orderId));
    }
    await connection.database
      .delete(products)
      .where(eq(products.id, product.id));
  }
});

void test("rolls back every change when any item lacks stock", async () => {
  const available = await makeProduct(5, "ROLLBACK-A");
  const unavailable = await makeProduct(0, "ROLLBACK-B");
  const beforeRows = await connection.database
    .select({ beforeCount: count() })
    .from(orders);
  const beforeCount = beforeRows[0]?.beforeCount;
  assert.notEqual(beforeCount, undefined);

  try {
    await assert.rejects(
      createOrder(connection.database, {
        items: [
          { productId: available.id, quantity: 2 },
          { productId: unavailable.id, quantity: 1 },
        ],
      }),
      InsufficientStockError,
    );

    const stocks = await connection.database
      .select()
      .from(inventory)
      .where(inArray(inventory.productId, [available.id, unavailable.id]));
    const stockById = new Map(
      stocks.map((stock) => [stock.productId, stock.availableQuantity]),
    );
    assert.equal(stockById.get(available.id), 5);
    assert.equal(stockById.get(unavailable.id), 0);

    const afterRows = await connection.database
      .select({ afterCount: count() })
      .from(orders);
    const afterCount = afterRows[0]?.afterCount;
    assert.equal(afterCount, beforeCount);
  } finally {
    await connection.database
      .delete(products)
      .where(inArray(products.id, [available.id, unavailable.id]));
  }
});

void test("two concurrent orders cannot consume the same final item", async () => {
  const product = await makeProduct(1, "CONCURRENT");
  const results = await Promise.allSettled([
    createOrder(connection.database, {
      items: [{ productId: product.id, quantity: 1 }],
    }),
    createOrder(connection.database, {
      items: [{ productId: product.id, quantity: 1 }],
    }),
  ]);

  try {
    const successes = results.filter((result) => result.status === "fulfilled");
    const failures = results.filter((result) => result.status === "rejected");
    assert.equal(successes.length, 1);
    assert.equal(failures.length, 1);
    assert.ok(
      failures[0]?.status === "rejected" &&
        failures[0].reason instanceof InsufficientStockError,
    );

    const [stock] = await connection.database
      .select()
      .from(inventory)
      .where(eq(inventory.productId, product.id));
    assert.equal(stock?.availableQuantity, 0);
  } finally {
    const successfulOrderIds = results.flatMap((result) =>
      result.status === "fulfilled" ? [result.value.id] : [],
    );
    if (successfulOrderIds.length > 0) {
      await connection.database
        .delete(orders)
        .where(inArray(orders.id, successfulOrderIds));
    }
    await connection.database
      .delete(products)
      .where(eq(products.id, product.id));
  }
});
