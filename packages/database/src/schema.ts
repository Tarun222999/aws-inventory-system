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

export const outboxStatus = pgEnum("outbox_status", [
  "pending",
  "publishing",
  "published",
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

export const productImages = pgTable(
  "product_images",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    objectKey: text("object_key").notNull(),
    contentType: varchar("content_type", { length: 32 }).notNull(),
    checksumSha256: varchar("checksum_sha256", { length: 44 }).notNull(),
    byteSize: integer("byte_size").notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("product_images_product_id_unique").on(table.productId),
    uniqueIndex("product_images_object_key_unique").on(table.objectKey),
    check(
      "product_images_content_type_supported",
      sql`${table.contentType} in ('image/jpeg', 'image/png', 'image/webp')`,
    ),
    check("product_images_byte_size_positive", sql`${table.byteSize} > 0`),
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

export const outboxMessages = pgTable(
  "outbox_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    messageType: varchar("message_type", { length: 100 }).notNull(),
    payload: jsonb("payload").notNull().default({}),
    status: outboxStatus("status").notNull().default("pending"),
    publishAttempts: integer("publish_attempts").notNull().default(0),
    availableAt: timestamp("available_at", { withTimezone: true, precision: 3 })
      .defaultNow()
      .notNull(),
    lockedAt: timestamp("locked_at", { withTimezone: true, precision: 3 }),
    lockedBy: varchar("locked_by", { length: 200 }),
    publishedAt: timestamp("published_at", {
      withTimezone: true,
      precision: 3,
    }),
    lastError: text("last_error"),
    ...timestamps,
  },
  (table) => [
    index("outbox_messages_claim_index").on(
      table.status,
      table.availableAt,
      table.createdAt,
    ),
    index("outbox_messages_order_id_index").on(table.orderId),
    uniqueIndex("outbox_messages_job_type_unique").on(
      table.jobId,
      table.messageType,
    ),
    check(
      "outbox_messages_publish_attempts_non_negative",
      sql`${table.publishAttempts} >= 0`,
    ),
    check(
      "outbox_messages_type_not_blank",
      sql`length(trim(${table.messageType})) > 0`,
    ),
    check(
      "outbox_messages_lock_fields_together",
      sql`(${table.lockedAt} is null) = (${table.lockedBy} is null)`,
    ),
  ],
);
