import { randomUUID } from "node:crypto";

import {
  loadOutboxPublisherConfig,
  resolveDatabaseEnvironment,
} from "@order-platform/config";
import { createDatabase } from "@order-platform/database";
import { createLogger } from "@order-platform/logger";

import {
  claimNextOutboxMessage,
  markOutboxPublished,
  releaseOutboxForRetry,
} from "./outbox.repository.js";
import { createSqsOutboxPublisher } from "./sqs-outbox-publisher.js";
import { createEventBridgeOutboxPublisher } from "./eventbridge-outbox-publisher.js";
import { createOutboxMessageRouter } from "./outbox-message-router.js";

const config = loadOutboxPublisherConfig(await resolveDatabaseEnvironment());
const logger = createLogger("outbox-publisher");
const publisherId = `outbox-publisher-${randomUUID()}`;
const { database, close: closeDatabase } = createDatabase(config.DATABASE_URL, {
  applicationName:
    `order-platform-outbox-publisher:${process.env.HOSTNAME ?? "local"}`.slice(
      0,
      63,
    ),
  maxConnections: config.DATABASE_POOL_MAX,
  onPoolError: (error) => logger.error("Database pool error", error),
  ...(config.DATABASE_SSL_CA_PATH
    ? { sslCertificateAuthorityPath: config.DATABASE_SSL_CA_PATH }
    : {}),
});
const sqsPublisher = createSqsOutboxPublisher({
  queueUrl: config.ORDER_PROCESSING_QUEUE_URL,
  region: config.AWS_REGION,
});

const eventBridgePublisher = createEventBridgeOutboxPublisher({
  eventBusName: config.ORDER_EVENT_BUS_NAME,
  region: config.AWS_REGION,
});

const publisher = createOutboxMessageRouter({
  sqsPublisher,
  eventBridgePublisher,
});

const shutdownController = new AbortController();

function wait(milliseconds: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const finish = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", finish);
      resolve();
    };
    const timer = setTimeout(finish, milliseconds);
    signal.addEventListener("abort", finish, { once: true });
    if (signal.aborted) finish();
  });
}

async function runPublisher(signal: AbortSignal) {
  let databaseAvailable: boolean | undefined;

  logger.info("Outbox publisher started", {
    publisherId,
    pollIntervalMs: config.OUTBOX_POLL_INTERVAL_MS,
    leaseTimeoutMs: config.OUTBOX_LEASE_TIMEOUT_MS,
  });

  while (!signal.aborted) {
    try {
      const outboxMessage = await claimNextOutboxMessage(
        database,
        publisherId,
        config.OUTBOX_LEASE_TIMEOUT_MS,
      );

      if (databaseAvailable !== true) {
        logger.info(
          databaseAvailable === false
            ? "Outbox publisher database connection recovered"
            : "Outbox publisher database connection established",
        );
      }
      databaseAvailable = true;

      if (!outboxMessage) {
        await wait(config.OUTBOX_POLL_INTERVAL_MS, signal);
        continue;
      }

      logger.info("Outbox message claimed", {
        eventId: outboxMessage.id,
        eventType: outboxMessage.messageType,
        jobId: outboxMessage.jobId,
        orderId: outboxMessage.orderId,
        attempt: outboxMessage.publishAttempts,
      });

      try {
        await publisher.publish(outboxMessage);

        const published = await markOutboxPublished(
          database,
          outboxMessage.id,
          publisherId,
        );
        logger.info(
          published
            ? "Outbox message published"
            : "Outbox publication lease lost",
          {
            eventId: outboxMessage.id,
            jobId: outboxMessage.jobId,
            orderId: outboxMessage.orderId,
            attempt: outboxMessage.publishAttempts,
          },
        );
      } catch (error) {
        const retryScheduled = await releaseOutboxForRetry(
          database,
          outboxMessage.id,
          publisherId,
          error,
          config.OUTBOX_RETRY_DELAY_MS,
        );
        logger.error("Outbox publish attempt failed", error, {
          eventId: outboxMessage.id,
          jobId: outboxMessage.jobId,
          orderId: outboxMessage.orderId,
          attempt: outboxMessage.publishAttempts,
          outcome: retryScheduled ? "retry_scheduled" : "lease_lost",
        });
      }
    } catch (error) {
      if (databaseAvailable !== false) {
        logger.error("Outbox publisher database connection unavailable", error);
      }
      databaseAvailable = false;
      await wait(config.OUTBOX_POLL_INTERVAL_MS, signal);
    }
  }
}

async function shutdown(signal: NodeJS.Signals) {
  if (shutdownController.signal.aborted) return;
  logger.info("Graceful shutdown started", { signal, publisherId });
  shutdownController.abort();

  const forceExitTimer = setTimeout(() => {
    logger.error(
      "Graceful shutdown timed out",
      new Error("Shutdown deadline exceeded"),
      { publisherId },
    );
    process.exit(1);
  }, config.SHUTDOWN_TIMEOUT_MS);
  forceExitTimer.unref();

  await publisherPromise;
  await closeDatabase();
  clearTimeout(forceExitTimer);
  logger.info("Graceful shutdown completed", { publisherId });
}

const publisherPromise = runPublisher(shutdownController.signal);

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    void shutdown(signal).catch((error: unknown) => {
      logger.error("Graceful shutdown failed", error, { publisherId });
      process.exitCode = 1;
    });
  });
}
