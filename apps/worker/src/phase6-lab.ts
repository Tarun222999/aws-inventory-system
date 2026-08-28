import assert from "node:assert/strict";

import {
  loadOutboxPublisherConfig,
  loadSqsWorkerConfig,
  resolveDatabaseEnvironment,
} from "@order-platform/config";
import {
  createDatabase,
  jobs,
  orders,
  outboxMessages,
} from "@order-platform/database";
import { eq } from "drizzle-orm";

import {
  claimNextOutboxMessage,
  markOutboxPublished,
} from "./outbox.repository.js";
import { processJob } from "./job.processor.js";
import { claimJobForSqsDelivery, completeJob } from "./job.repository.js";
import { createSqsJobQueue } from "./sqs-job-queue.js";
import { createSqsOutboxPublisher } from "./sqs-outbox-publisher.js";

function safeError(error: unknown) {
  const databaseErrorCode =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
      ? error.code
      : undefined;

  return {
    name:
      typeof error === "object" &&
      error !== null &&
      "name" in error &&
      typeof error.name === "string"
        ? error.name
        : "UnknownError",
    ...(databaseErrorCode ? { databaseErrorCode } : {}),
  };
}

let currentStage = "startup";

async function main() {
  currentStage = "resolve-database-environment";
  const environment = await resolveDatabaseEnvironment();

  currentStage = "validate-configuration";
  const publisherConfig = loadOutboxPublisherConfig(environment);
  const workerConfig = loadSqsWorkerConfig(environment);

  currentStage = "create-database-pool";
  const connection = createDatabase(workerConfig.DATABASE_URL, {
    applicationName: "order-platform-phase6-lab",
    maxConnections: workerConfig.DATABASE_POOL_MAX,
    onPoolError: (error) =>
      console.error("phase6.pool_error", safeError(error)),
    ...(workerConfig.DATABASE_SSL_CA_PATH
      ? { sslCertificateAuthorityPath: workerConfig.DATABASE_SSL_CA_PATH }
      : {}),
  });
  const publisher = createSqsOutboxPublisher({
    queueUrl: publisherConfig.ORDER_PROCESSING_QUEUE_URL,
    region: publisherConfig.AWS_REGION,
  });
  const queue = createSqsJobQueue({
    queueUrl: workerConfig.ORDER_PROCESSING_QUEUE_URL,
    region: workerConfig.AWS_REGION,
  });

  let orderId: string | undefined;
  let messageMayHaveBeenSent = false;
  let receiptDeleted = false;

  try {
    currentStage = "create-disposable-order-job-outbox";
    const fixture = await connection.database.transaction(
      async (transaction) => {
        const [order] = await transaction
          .insert(orders)
          .values({ totalPaise: 100 })
          .returning();
        assert.ok(order);

        const [job] = await transaction
          .insert(jobs)
          .values({
            orderId: order.id,
            type: "fulfill_order",
            payload: { orderId: order.id },
          })
          .returning();
        assert.ok(job);

        const [outboxMessage] = await transaction
          .insert(outboxMessages)
          .values({
            jobId: job.id,
            orderId: order.id,
            messageType: "fulfill_order",
            payload: { jobId: job.id, orderId: order.id },
          })
          .returning();
        assert.ok(outboxMessage);

        return { order, job, outboxMessage };
      },
    );
    orderId = fixture.order.id;

    console.log("phase6.fixture_created", {
      eventId: fixture.outboxMessage.id,
      jobId: fixture.job.id,
      orderId: fixture.order.id,
    });

    currentStage = "claim-outbox-message";
    const publisherId = "phase6-lab-publisher";
    const claimedOutboxMessage = await claimNextOutboxMessage(
      connection.database,
      publisherId,
      publisherConfig.OUTBOX_LEASE_TIMEOUT_MS,
    );
    assert.equal(claimedOutboxMessage?.id, fixture.outboxMessage.id);

    currentStage = "send-sqs-message";
    messageMayHaveBeenSent = true;
    await publisher.publish(claimedOutboxMessage);

    currentStage = "mark-outbox-published";
    assert.equal(
      await markOutboxPublished(
        connection.database,
        claimedOutboxMessage.id,
        publisherId,
      ),
      true,
    );

    currentStage = "long-poll-sqs";
    const delivery = await queue.receiveOne(
      workerConfig.SQS_RECEIVE_WAIT_TIME_SECONDS,
    );
    assert.ok(delivery);
    assert.equal(delivery.eventId, fixture.outboxMessage.id);
    assert.equal(delivery.eventType, "fulfill_order");
    assert.equal(delivery.jobId, fixture.job.id);
    assert.equal(delivery.orderId, fixture.order.id);

    console.log("phase6.delivery_received", {
      eventId: delivery.eventId,
      jobId: delivery.jobId,
      orderId: delivery.orderId,
      receiveCount: delivery.receiveCount,
    });

    currentStage = "claim-job-from-sqs-delivery";
    const claim = await claimJobForSqsDelivery(
      connection.database,
      delivery.jobId,
      "phase6-lab-worker",
      workerConfig.WORKER_LEASE_TIMEOUT_MS,
    );
    assert.equal(claim.kind, "claimed");
    if (claim.kind !== "claimed") {
      throw new Error("Expected the SQS delivery to claim its job");
    }

    currentStage = "process-job";
    await processJob(claim.job, workerConfig.WORKER_PROCESSING_DELAY_MS);

    currentStage = "complete-job";
    assert.equal(
      await completeJob(connection.database, claim.job.id, "phase6-lab-worker"),
      true,
    );

    currentStage = "delete-sqs-receipt";
    await queue.delete(delivery.receiptHandle);
    receiptDeleted = true;

    currentStage = "verify-terminal-state";
    const [job] = await connection.database
      .select()
      .from(jobs)
      .where(eq(jobs.id, fixture.job.id));
    const [outboxMessage] = await connection.database
      .select()
      .from(outboxMessages)
      .where(eq(outboxMessages.id, fixture.outboxMessage.id));

    assert.equal(job?.status, "completed");
    assert.equal(outboxMessage?.status, "published");

    console.log("phase6.happy_path", {
      completed: true,
      eventId: fixture.outboxMessage.id,
      jobId: fixture.job.id,
      orderId: fixture.order.id,
    });
  } finally {
    if (orderId && (!messageMayHaveBeenSent || receiptDeleted)) {
      await connection.database.delete(orders).where(eq(orders.id, orderId));
      console.log("phase6.cleanup", { testRowsDeleted: true });
    } else if (orderId) {
      console.error("phase6.cleanup", {
        testRowsDeleted: false,
        reason: "SQS message may still require recovery",
      });
    }

    await connection.close();
  }
}

void main().catch((error: unknown) => {
  console.error("phase6.lab", {
    completed: false,
    error: safeError(error),
    stage: currentStage,
  });
  process.exitCode = 1;
});
