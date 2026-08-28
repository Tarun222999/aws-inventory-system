import assert from "node:assert/strict";
import { test } from "node:test";

import {
  DeleteMessageCommand,
  ReceiveMessageCommand,
  SQSClient,
} from "@aws-sdk/client-sqs";

import { createSqsJobQueue, parseSqsJobEnvelope } from "./sqs-job-queue.js";

const queueUrl =
  "https://sqs.ap-south-1.amazonaws.com/992382645171/order-platform-phase6-order-processing";
const eventId = "11111111-1111-4111-8111-111111111111";
const jobId = "22222222-2222-4222-8222-222222222222";
const orderId = "33333333-3333-4333-8333-333333333333";

void test("long-polls, parses, and acknowledges an SQS job message", async () => {
  const commands: unknown[] = [];
  const client = {
    send(command: unknown) {
      commands.push(command);
      if (command instanceof ReceiveMessageCommand) {
        return Promise.resolve({
          Messages: [
            {
              Body: JSON.stringify({
                eventId,
                eventType: "fulfill_order",
                jobId,
                orderId,
                payload: { jobId, orderId },
              }),
              ReceiptHandle: "opaque-receipt-handle",
              Attributes: { ApproximateReceiveCount: "2" },
            },
          ],
        });
      }
      if (command instanceof DeleteMessageCommand) {
        return Promise.resolve({});
      }
      throw new Error("Unexpected SQS command");
    },
  } as unknown as SQSClient;

  const queue = createSqsJobQueue({
    queueUrl,
    region: "ap-south-1",
    client,
  });

  const message = await queue.receiveOne(20);
  assert.deepEqual(message, {
    eventId,
    eventType: "fulfill_order",
    jobId,
    orderId,
    payload: { jobId, orderId },
    receiptHandle: "opaque-receipt-handle",
    receiveCount: 2,
  });

  const receiveCommand = commands[0];
  assert.ok(receiveCommand instanceof ReceiveMessageCommand);
  assert.deepEqual(receiveCommand.input, {
    QueueUrl: queueUrl,
    MaxNumberOfMessages: 1,
    WaitTimeSeconds: 20,
    MessageSystemAttributeNames: ["ApproximateReceiveCount"],
    MessageAttributeNames: ["All"],
  });

  await queue.delete("opaque-receipt-handle");
  const deleteCommand = commands[1];
  assert.ok(deleteCommand instanceof DeleteMessageCommand);
  assert.deepEqual(deleteCommand.input, {
    QueueUrl: queueUrl,
    ReceiptHandle: "opaque-receipt-handle",
  });
});

void test("rejects malformed job-message envelopes", () => {
  assert.throws(() => parseSqsJobEnvelope("not-json"));
  assert.throws(() => parseSqsJobEnvelope("[]"), /JSON object/);
  assert.throws(
    () =>
      parseSqsJobEnvelope(
        JSON.stringify({
          eventId,
          eventType: "fulfill_order",
          jobId,
          orderId,
        }),
      ),
    /payload is required/,
  );
});
