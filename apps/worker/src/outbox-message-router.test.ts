import assert from "node:assert/strict";
import { test } from "node:test";

import { ORDER_CONFIRMED_DETAIL_TYPE } from "@order-platform/events";

import type { ClaimedOutboxMessage } from "./outbox.repository.js";
import { createOutboxMessageRouter } from "./outbox-message-router.js";

function createMessage(messageType: string): ClaimedOutboxMessage {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    jobId: "22222222-2222-4222-8222-222222222222",
    orderId: "33333333-3333-4333-8333-333333333333",
    messageType,
    payload: {},
  } as ClaimedOutboxMessage;
}

void test("routes fulfill_order messages only to SQS", async () => {
  const calls: string[] = [];

  const router = createOutboxMessageRouter({
    sqsPublisher: {
      publish() {
        calls.push("sqs");
        return Promise.resolve();
      },
    },
    eventBridgePublisher: {
      publish() {
        calls.push("eventbridge");
        return Promise.resolve();
      },
    },
  });

  await router.publish(createMessage("fulfill_order"));

  assert.deepEqual(calls, ["sqs"]);
});

void test("routes OrderConfirmed messages only to EventBridge", async () => {
  const calls: string[] = [];

  const router = createOutboxMessageRouter({
    sqsPublisher: {
      publish() {
        calls.push("sqs");
        return Promise.resolve();
      },
    },
    eventBridgePublisher: {
      publish() {
        calls.push("eventbridge");
        return Promise.resolve();
      },
    },
  });

  await router.publish(createMessage(ORDER_CONFIRMED_DETAIL_TYPE));

  assert.deepEqual(calls, ["eventbridge"]);
});

void test("rejects unknown outbox message types", async () => {
  const calls: string[] = [];

  const router = createOutboxMessageRouter({
    sqsPublisher: {
      publish() {
        calls.push("sqs");
        return Promise.resolve();
      },
    },
    eventBridgePublisher: {
      publish() {
        calls.push("eventbridge");
        return Promise.resolve();
      },
    },
  });

  await assert.rejects(
    router.publish(createMessage("SomethingUnexpected")),
    /Unsupported outbox message type: SomethingUnexpected/,
  );

  assert.deepEqual(calls, []);
});
