import assert from "node:assert/strict";
import { test } from "node:test";

import {
  EventBridgeClient,
  PutEventsCommand,
} from "@aws-sdk/client-eventbridge";

import {
  ORDER_CONFIRMED_DETAIL_TYPE,
  ORDER_CONFIRMED_SCHEMA_VERSION,
  ORDER_EVENT_SOURCE,
} from "@order-platform/events";

import type { ClaimedOutboxMessage } from "./outbox.repository.js";
import { createEventBridgeOutboxPublisher } from "./eventbridge-outbox-publisher.js";

const occurredAt = "2026-09-07T08:30:00.000Z";

const outboxMessage = {
  id: "11111111-1111-4111-8111-111111111111",
  jobId: "22222222-2222-4222-8222-222222222222",
  orderId: "33333333-3333-4333-8333-333333333333",
  messageType: ORDER_CONFIRMED_DETAIL_TYPE,
  payload: {
    schemaVersion: ORDER_CONFIRMED_SCHEMA_VERSION,
    eventId: "11111111-1111-4111-8111-111111111111",
    correlationId: "33333333-3333-4333-8333-333333333333",
    causationId: "44444444-4444-4444-8444-444444444444",
    occurredAt,
    order: {
      id: "33333333-3333-4333-8333-333333333333",
      totalPaise: 12_500,
      currency: "INR",
    },
  },
} as ClaimedOutboxMessage;

void test("publishes OrderConfirmed using the shared EventBridge contract", async () => {
  let sentCommand: PutEventsCommand | undefined;

  const client = {
    send(command: unknown) {
      assert.ok(command instanceof PutEventsCommand);
      sentCommand = command;

      return Promise.resolve({
        FailedEntryCount: 0,
        Entries: [{ EventId: "aws-event-id" }],
      });
    },
  } as unknown as EventBridgeClient;

  const publisher = createEventBridgeOutboxPublisher({
    eventBusName: "order-platform-phase7",
    region: "ap-south-1",
    client,
  });

  await publisher.publish(outboxMessage);

  assert.ok(sentCommand);

  const entries = sentCommand.input.Entries;
  assert.equal(entries?.length, 1);

  const entry = entries?.[0];
  assert.ok(entry);

  assert.equal(entry.EventBusName, "order-platform-phase7");
  assert.equal(entry.Source, ORDER_EVENT_SOURCE);
  assert.equal(entry.DetailType, ORDER_CONFIRMED_DETAIL_TYPE);
  assert.deepEqual(entry.Time, new Date(occurredAt));
  assert.deepEqual(JSON.parse(entry.Detail ?? ""), outboxMessage.payload);
});

void test("rejects an invalid event payload before contacting EventBridge", async () => {
  let sendCalls = 0;

  const client = {
    send() {
      sendCalls += 1;

      return Promise.resolve({
        FailedEntryCount: 0,
        Entries: [{ EventId: "unexpected-event-id" }],
      });
    },
  } as unknown as EventBridgeClient;

  const publisher = createEventBridgeOutboxPublisher({
    eventBusName: "order-platform-phase7",
    region: "ap-south-1",
    client,
  });

  await assert.rejects(
    publisher.publish({
      ...outboxMessage,
      payload: {},
    }),
  );

  assert.equal(sendCalls, 0);
});

void test("throws when EventBridge rejects an individual event", async () => {
  const client = {
    send(command: unknown) {
      assert.ok(command instanceof PutEventsCommand);

      return Promise.resolve({
        FailedEntryCount: 1,
        Entries: [
          {
            ErrorCode: "InternalFailure",
            ErrorMessage: "Temporary EventBridge failure",
          },
        ],
      });
    },
  } as unknown as EventBridgeClient;

  const publisher = createEventBridgeOutboxPublisher({
    eventBusName: "order-platform-phase7",
    region: "ap-south-1",
    client,
  });

  await assert.rejects(
    publisher.publish(outboxMessage),
    /InternalFailure: Temporary EventBridge failure/,
  );
});
