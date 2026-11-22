import assert from "node:assert/strict";
import test from "node:test";
import { createOrderSchema } from "./order.schemas.js";
import {
  createProductSchema,
  productListQuerySchema,
} from "../products/product.schemas.js";

const productId = "550e8400-e29b-41d4-a716-446655440000";

void test("validation retains order limits, duplicate checks and strict objects", () => {
  const item = { productId, quantity: 1 };
  assert.deepEqual(createOrderSchema.parse({ items: [item] }), {
    items: [item],
  });
  for (const input of [
    { items: [] },
    { items: [item, item] },
    { items: [item], extra: true },
    { items: [{ ...item, quantity: 10_001 }] },
    { items: [{ ...item, productId: "invalid" }] },
    { items: Array.from({ length: 51 }, () => item) },
  ]) {
    assert.equal(createOrderSchema.safeParse(input).success, false);
  }
});

void test("validation retains query defaults and rejects unsafe money values", () => {
  assert.deepEqual(productListQuerySchema.parse({}), { limit: 20 });
  assert.deepEqual(productListQuerySchema.parse({ limit: "10" }), {
    limit: 10,
  });
  const product = {
    sku: " BOOK ",
    name: " Book ",
    pricePaise: 2_500,
    initialQuantity: 1,
  };
  assert.deepEqual(createProductSchema.parse(product), {
    ...product,
    sku: "BOOK",
    name: "Book",
  });
  for (const pricePaise of [NaN, Infinity, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(
      createProductSchema.safeParse({ ...product, pricePaise }).success,
      false,
    );
  }
});
