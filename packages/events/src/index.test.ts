import assert from "node:assert/strict";
import test from "node:test";

import {
  ORDER_CONFIRMED_DETAIL_TYPE,
  ORDER_EVENT_SOURCE,
  orderConfirmedDetailV1Schema,
  createOrderConfirmedPublicationV1,
  orderConfirmedPublicationV1Schema,
} from "./index.js";

const validDetail = {
  schemaVersion: 1,
  eventId: "11111111-1111-4111-8111-111111111111",
  correlationId: "22222222-2222-4222-8222-222222222222",
  causationId: "33333333-3333-4333-8333-333333333333",
  occurredAt: "2026-09-06T10:15:30.000Z",
  order: {
    id: "44444444-4444-4444-8444-444444444444",
    totalPaise: 149_900,
    currency: "INR",
  },
} as const;

void test("accepts a valid OrderConfirmed v1 detail", () => {
  const parsed = orderConfirmedDetailV1Schema.parse(validDetail);

  assert.deepEqual(parsed, validDetail);
  assert.equal(ORDER_EVENT_SOURCE, "com.order-platform.orders");
  assert.equal(ORDER_CONFIRMED_DETAIL_TYPE, "OrderConfirmed");
});

void test("accepts an additive field without breaking a v1 consumer", () => {
  const parsed = orderConfirmedDetailV1Schema.parse({
    ...validDetail,
    optionalFutureField: "new information",
  });

  assert.equal(parsed.optionalFutureField, "new information");
  assert.equal(parsed.order.id, validDetail.order.id);
});

void test("rejects a breaking schema-version change", () => {
  const result = orderConfirmedDetailV1Schema.safeParse({
    ...validDetail,
    schemaVersion: 2,
  });

  assert.equal(result.success, false);
});

void test("rejects invalid money and timestamps", () => {
  const negativeTotal = orderConfirmedDetailV1Schema.safeParse({
    ...validDetail,
    order: {
      ...validDetail.order,
      totalPaise: -1,
    },
  });

  const fractionalTotal = orderConfirmedDetailV1Schema.safeParse({
    ...validDetail,
    order: {
      ...validDetail.order,
      totalPaise: 1499.5,
    },
  });

  const timestampWithoutTimezone = orderConfirmedDetailV1Schema.safeParse({
    ...validDetail,
    occurredAt: "2026-09-06T10:15:30",
  });

  assert.equal(negativeTotal.success, false);
  assert.equal(fractionalTotal.success, false);
  assert.equal(timestampWithoutTimezone.success, false);
});

void test("creates an EventBridge-neutral OrderConfirmed publication", () => {
  const publication = createOrderConfirmedPublicationV1(validDetail);

  assert.equal(publication.source, ORDER_EVENT_SOURCE);
  assert.equal(publication.detailType, ORDER_CONFIRMED_DETAIL_TYPE);
  assert.equal(publication.time.toISOString(), validDetail.occurredAt);
  assert.deepEqual(publication.detail, validDetail);
});

void test("rejects disagreement between publication time and occurredAt", () => {
  const result = orderConfirmedPublicationV1Schema.safeParse({
    source: ORDER_EVENT_SOURCE,
    detailType: ORDER_CONFIRMED_DETAIL_TYPE,
    time: new Date("2026-09-06T11:15:30.000Z"),
    detail: validDetail,
  });

  assert.equal(result.success, false);
});
