import assert from "node:assert/strict";
import { test } from "node:test";

import type { SendEmailCommand } from "@aws-sdk/client-sesv2";

import { createSesOrderConfirmedConsumer } from "./ses-order-confirmed-consumer.js";

function createValidEvent() {
  return {
    schemaVersion: 1,
    eventId: "11111111-1111-4111-8111-111111111111",
    correlationId: "22222222-2222-4222-8222-222222222222",
    causationId: "33333333-3333-4333-8333-333333333333",
    occurredAt: "2026-09-13T10:00:00.000Z",
    order: {
      id: "44444444-4444-4444-8444-444444444444",
      totalPaise: 12500,
      currency: "INR",
    },
  };
}

void test("sends an email for a valid OrderConfirmed event", async () => {
  const commands: SendEmailCommand[] = [];

  const consumer = createSesOrderConfirmedConsumer({
    region: "ap-south-1",
    fromEmailAddress: "sender@example.com",
    toEmailAddress: "customer@example.com",
    sendCommand(command) {
      commands.push(command);

      return Promise.resolve({
        MessageId: "ses-message-123",
      });
    },
  });

  const messageId = await consumer.handle(createValidEvent());

  assert.equal(messageId, "ses-message-123");
  assert.equal(commands.length, 1);

  const input = commands[0]?.input;

  assert.deepEqual(input?.Destination?.ToAddresses, ["customer@example.com"]);

  assert.match(input?.Content?.Simple?.Body?.Text?.Data ?? "", /₹125\.00/);
});

void test("rejects an invalid event before calling SES", async () => {
  let sendCount = 0;

  const consumer = createSesOrderConfirmedConsumer({
    region: "ap-south-1",
    fromEmailAddress: "sender@example.com",
    toEmailAddress: "customer@example.com",
    sendCommand() {
      sendCount += 1;

      return Promise.resolve({
        MessageId: "should-not-be-used",
      });
    },
  });

  await assert.rejects(
    consumer.handle({
      ...createValidEvent(),
      schemaVersion: 2,
    }),
  );

  assert.equal(sendCount, 0);
});

void test("accepts additive fields from a newer producer", async () => {
  const consumer = createSesOrderConfirmedConsumer({
    region: "ap-south-1",
    fromEmailAddress: "sender@example.com",
    toEmailAddress: "customer@example.com",
    sendCommand() {
      return Promise.resolve({
        MessageId: "ses-message-456",
      });
    },
  });

  const messageId = await consumer.handle({
    ...createValidEvent(),
    futureOptionalField: "ignored by the version 1 consumer",
  });

  assert.equal(messageId, "ses-message-456");
});

void test("fails when SES does not return a MessageId", async () => {
  const consumer = createSesOrderConfirmedConsumer({
    region: "ap-south-1",
    fromEmailAddress: "sender@example.com",
    toEmailAddress: "customer@example.com",
    sendCommand() {
      return Promise.resolve({});
    },
  });

  await assert.rejects(
    consumer.handle(createValidEvent()),
    /Amazon SES did not return a MessageId/,
  );
});
