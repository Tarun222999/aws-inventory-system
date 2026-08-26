import assert from "node:assert/strict";
import { test } from "node:test";

import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";

import type { ClaimedOutboxMessage } from "./outbox.repository.js";
import { createSqsOutboxPublisher } from "./sqs-outbox-publisher.js";

const outboxMessage = {
  id: "11111111-1111-4111-8111-111111111111",
  jobId: "22222222-2222-4222-8222-222222222222",
  orderId: "33333333-3333-4333-8333-333333333333",
  messageType: "fulfill_order",
  payload: {
    jobId: "22222222-2222-4222-8222-222222222222",
    orderId: "33333333-3333-4333-8333-333333333333",
  },
} as ClaimedOutboxMessage;

void test("publishes an outbox message with a stable envelope and attributes", async () => {
  let sentCommand: SendMessageCommand | undefined;
  const client = {
    send(command: unknown) {
      assert.ok(command instanceof SendMessageCommand);
      sentCommand = command;
      return Promise.resolve({ MessageId: "test-message-id" });
    },
  } as unknown as SQSClient;

  const publisher = createSqsOutboxPublisher({
    queueUrl:
      "https://sqs.ap-south-1.amazonaws.com/992382645171/order-platform-phase6-order-processing",
    region: "ap-south-1",
    client,
  });

  await publisher.publish(outboxMessage);

  assert.ok(sentCommand);
  assert.equal(
    sentCommand.input.QueueUrl,
    "https://sqs.ap-south-1.amazonaws.com/992382645171/order-platform-phase6-order-processing",
  );
  assert.deepEqual(JSON.parse(sentCommand.input.MessageBody ?? ""), {
    eventId: outboxMessage.id,
    eventType: outboxMessage.messageType,
    jobId: outboxMessage.jobId,
    orderId: outboxMessage.orderId,
    payload: outboxMessage.payload,
  });
  assert.deepEqual(sentCommand.input.MessageAttributes, {
    eventId: {
      DataType: "String",
      StringValue: outboxMessage.id,
    },
    eventType: {
      DataType: "String",
      StringValue: outboxMessage.messageType,
    },
    jobId: {
      DataType: "String",
      StringValue: outboxMessage.jobId,
    },
    orderId: {
      DataType: "String",
      StringValue: outboxMessage.orderId,
    },
  });
});
