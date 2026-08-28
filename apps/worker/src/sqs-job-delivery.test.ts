import assert from "node:assert/strict";
import { test } from "node:test";

import type { ClaimedJob, SqsJobClaim } from "./job.repository.js";
import {
  handleSqsJobDelivery,
  type SqsJobDeliveryDependencies,
} from "./sqs-job-delivery.js";
import type { ReceivedJobMessage } from "./sqs-job-queue.js";

const job = {
  id: "11111111-1111-4111-8111-111111111111",
  orderId: "22222222-2222-4222-8222-222222222222",
  type: "fulfill_order",
  payload: { orderId: "22222222-2222-4222-8222-222222222222" },
  attempts: 1,
} as ClaimedJob;

const message: ReceivedJobMessage = {
  eventId: "33333333-3333-4333-8333-333333333333",
  eventType: "fulfill_order",
  jobId: job.id,
  orderId: job.orderId,
  payload: { jobId: job.id, orderId: job.orderId },
  receiptHandle: "opaque-receipt-handle",
  receiveCount: 1,
};

function createDependencies(claim: SqsJobClaim = { kind: "claimed", job }) {
  const calls: string[] = [];
  const dependencies: SqsJobDeliveryDependencies = {
    workerId: "test-worker",
    leaseTimeoutMs: 30_000,
    maximumAttempts: 3,
    retryDelayMs: 1_000,
    processingDelayMs: 0,
    claimJob: async () => {
      calls.push("claim");
      return claim;
    },
    completeJob: async () => {
      calls.push("complete");
      return true;
    },
    recordFailure: async () => {
      calls.push("record_failure");
      return "retry_scheduled";
    },
    processJob: async () => {
      calls.push("process");
    },
    acknowledge: async () => {
      calls.push("acknowledge");
    },
    log: {
      info: () => undefined,
      error: () => undefined,
    },
  };
  return { calls, dependencies };
}

void test("acknowledges only after a claimed job completes", async () => {
  const { calls, dependencies } = createDependencies();

  await handleSqsJobDelivery(message, dependencies);

  assert.deepEqual(calls, ["claim", "process", "complete", "acknowledge"]);
});

void test("acknowledges a completed duplicate without processing it again", async () => {
  const { calls, dependencies } = createDependencies({
    kind: "already_completed",
  });

  await handleSqsJobDelivery(message, dependencies);

  assert.deepEqual(calls, ["claim", "acknowledge"]);
});

void test("leaves a processing failure unacknowledged for SQS retry", async () => {
  const { calls, dependencies } = createDependencies();
  dependencies.processJob = async () => {
    calls.push("process");
    throw new Error("simulated failure");
  };

  await handleSqsJobDelivery(message, dependencies);

  assert.deepEqual(calls, ["claim", "process", "record_failure"]);
});

void test("leaves a correlation mismatch unacknowledged", async () => {
  const { calls, dependencies } = createDependencies();
  const mismatchedMessage = { ...message, orderId: "different-order-id" };

  await handleSqsJobDelivery(mismatchedMessage, dependencies);

  assert.deepEqual(calls, ["claim", "record_failure"]);
});

void test("leaves a fresh lease unacknowledged", async () => {
  const { calls, dependencies } = createDependencies({
    kind: "not_claimable",
  });

  await handleSqsJobDelivery(message, dependencies);

  assert.deepEqual(calls, ["claim"]);
});
