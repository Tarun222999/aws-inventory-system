import { asc, eq, inArray, sql } from "drizzle-orm";

import {
  inventory,
  jobs,
  orderItems,
  orders,
  products,
  type Database,
} from "@order-platform/database";

import type { CreateOrderInput } from "./order.schemas.js";

export class OrderedProductNotFoundError extends Error {}
export class InsufficientStockError extends Error {}
export class OrderTotalTooLargeError extends Error {}

export async function createOrder(database: Database, input: CreateOrderInput) {
  const requestedItems = [...input.items].sort((left, right) =>
    left.productId.localeCompare(right.productId),
  );

  return database.transaction(async (transaction) => {
    const lockedProducts = await transaction
      .select({
        id: products.id,
        sku: products.sku,
        name: products.name,
        pricePaise: products.pricePaise,
        availableQuantity: inventory.availableQuantity,
      })
      .from(products)
      .innerJoin(inventory, eq(inventory.productId, products.id))
      .where(
        inArray(
          products.id,
          requestedItems.map((item) => item.productId),
        ),
      )
      .orderBy(asc(products.id))
      .for("update");

    if (lockedProducts.length !== requestedItems.length) {
      throw new OrderedProductNotFoundError(
        "One or more requested products do not exist",
      );
    }

    const productsById = new Map(
      lockedProducts.map((product) => [product.id, product]),
    );
    let totalPaise = 0;

    const itemValues = requestedItems.map((item) => {
      const product = productsById.get(item.productId);
      if (!product) {
        throw new OrderedProductNotFoundError(
          `Product ${item.productId} does not exist`,
        );
      }
      if (product.availableQuantity < item.quantity) {
        throw new InsufficientStockError(
          `Insufficient stock for product ${product.id}`,
        );
      }

      const lineTotalPaise = product.pricePaise * item.quantity;
      totalPaise += lineTotalPaise;
      return { product, quantity: item.quantity, lineTotalPaise };
    });

    if (!Number.isSafeInteger(totalPaise) || totalPaise > 2_147_483_647) {
      throw new OrderTotalTooLargeError(
        "Order total exceeds the supported limit",
      );
    }

    const [order] = await transaction
      .insert(orders)
      .values({ totalPaise })
      .returning();
    if (!order) throw new Error("Order insert returned no row");

    const items = await transaction
      .insert(orderItems)
      .values(
        itemValues.map(({ product, quantity, lineTotalPaise }) => ({
          orderId: order.id,
          productId: product.id,
          skuSnapshot: product.sku,
          nameSnapshot: product.name,
          unitPricePaise: product.pricePaise,
          quantity,
          lineTotalPaise,
        })),
      )
      .returning();

    for (const { product, quantity } of itemValues) {
      await transaction
        .update(inventory)
        .set({
          availableQuantity: sql`${inventory.availableQuantity} - ${quantity}`,
          updatedAt: new Date(),
        })
        .where(eq(inventory.productId, product.id));
    }

    await transaction.insert(jobs).values({
      orderId: order.id,
      type: "fulfill_order",
      payload: { orderId: order.id },
    });

    return { ...order, items };
  });
}

export async function findOrderById(database: Database, id: string) {
  const [order] = await database
    .select()
    .from(orders)
    .where(eq(orders.id, id))
    .limit(1);
  if (!order) return undefined;

  const items = await database
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, id))
    .orderBy(asc(orderItems.id));
  return { ...order, items };
}
