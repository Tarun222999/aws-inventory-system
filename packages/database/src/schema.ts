import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const orderStatus = pgEnum("order_status", [
  "pending",
  "processing",
  "ready_to_ship",
  "failed",
]);

export const jobStatus = pgEnum("job_status", [
  "pending",
  "processing",
  "completed",
  "failed",
]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true, precision: 3 })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, precision: 3 })
    .defaultNow()
    .notNull(),
};

export const products = pgTable(
  "products",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sku: varchar("sku", { length: 64 }).notNull(),
    name: varchar("name", { length: 200 }).notNull(),
    description: text("description"),
    pricePaise: integer("price_paise").notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("products_sku_unique").on(table.sku),
    index("products_created_at_id_index").on(table.createdAt, table.id),
    check("products_price_positive", sql`${table.pricePaise} > 0`),
    check("products_sku_not_blank", sql`length(trim(${table.sku})) > 0`),
    check("products_name_not_blank", sql`length(trim(${table.name})) > 0`),
  ],
);

export const inventory = pgTable(
  "inventory",
  {
    productId: uuid("product_id")
      .primaryKey()
      .references(() => products.id, { onDelete: "cascade" }),
    availableQuantity: integer("available_quantity").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true, precision: 3 })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check(
      "inventory_available_non_negative",
      sql`${table.availableQuantity} >= 0`,
    ),
  ],
);

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    status: orderStatus("status").notNull().default("pending"),
    totalPaise: integer("total_paise").notNull(),
    ...timestamps,
  },
  (table) => [
    check("orders_total_non_negative", sql`${table.totalPaise} >= 0`),
    index("orders_created_at_id_index").on(table.createdAt, table.id),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    skuSnapshot: varchar("sku_snapshot", { length: 64 }).notNull(),
    nameSnapshot: varchar("name_snapshot", { length: 200 }).notNull(),
    unitPricePaise: integer("unit_price_paise").notNull(),
    quantity: integer("quantity").notNull(),
    lineTotalPaise: integer("line_total_paise").notNull(),
  },
  (table) => [
    index("order_items_order_id_index").on(table.orderId),
    index("order_items_product_id_index").on(table.productId),
    uniqueIndex("order_items_order_product_unique").on(
      table.orderId,
      table.productId,
    ),
    check("order_items_quantity_positive", sql`${table.quantity} > 0`),
    check("order_items_unit_price_positive", sql`${table.unitPricePaise} > 0`),
    check(
      "order_items_line_total_consistent",
      sql`${table.lineTotalPaise} = ${table.unitPricePaise} * ${table.quantity}`,
    ),
  ],
);

export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 100 }).notNull(),
    payload: jsonb("payload").notNull().default({}),
    status: jobStatus("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    availableAt: timestamp("available_at", { withTimezone: true, precision: 3 })
      .defaultNow()
      .notNull(),
    lockedAt: timestamp("locked_at", { withTimezone: true, precision: 3 }),
    lockedBy: varchar("locked_by", { length: 200 }),
    lastError: text("last_error"),
    ...timestamps,
  },
  (table) => [
    index("jobs_claim_index").on(
      table.status,
      table.availableAt,
      table.createdAt,
    ),
    index("jobs_order_id_index").on(table.orderId),
    uniqueIndex("jobs_order_type_unique").on(table.orderId, table.type),
    check("jobs_attempts_non_negative", sql`${table.attempts} >= 0`),
    check("jobs_type_not_blank", sql`length(trim(${table.type})) > 0`),
    check(
      "jobs_lock_fields_together",
      sql`(${table.lockedAt} is null) = (${table.lockedBy} is null)`,
    ),
  ],
);
