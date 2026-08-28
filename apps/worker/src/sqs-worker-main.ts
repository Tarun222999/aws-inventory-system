import { randomUUID } from "node:crypto";

import {
  loadSqsWorkerConfig,
  resolveDatabaseEnvironment,
} from "@order-platform/config";
import { createDatabase } from "@order-platform/database";
import { createLogger } from "@order-platform/logger";

import { processJob } from "./job.processor.js";
import {
  claimJobForSqsDelivery,
  completeJob,
  recordJobFailure,
} from "./job.repository.js";
import { handleSqsJobDelivery } from "./sqs-job-delivery.js";
import type { ReceivedJobMessage } from "./sqs-job-queue.js";
import { createSqsJobQueue } from "./sqs-job-queue.js";

const config = loadSqsWorkerConfig(await resolveDatabaseEnvironment());
const logger = createLogger("sqs-worker");
const workerId = `sqs-worker-${randomUUID()}`;

const { database, close: closeDatabase } = createDatabase(config.DATABASE_URL, {
  applicationName:
    `order-platform-sqs-worker:${process.env.HOSTNAME ?? "local"}`.slice(0, 63),
  maxConnections: config.DATABASE_POOL_MAX,
  onPoolError: (error) => logger.error("Database pool error", error),
  ...(config.DATABASE_SSL_CA_PATH
    ? { sslCertificateAuthorityPath: config.DATABASE_SSL_CA_PATH }
    : {}),
});

const jobQueue = createSqsJobQueue({
  queueUrl: config.ORDER_PROCESSING_QUEUE_URL,
  region: config.AWS_REGION,
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

async function acknowledge(
  receiptHandle: string,
  details: Record<string, unknown>,
) {
  try {
    await jobQueue.delete(receiptHandle);
    logger.info("SQS delivery acknowledged", details);
  } catch (error) {
    logger.error(
      "SQS acknowledgement failed; a duplicate may be delivered",
      error,
      details,
    );
  }
}

async function handleMessage(message: ReceivedJobMessage) {
  await handleSqsJobDelivery(message, {
    workerId,
    leaseTimeoutMs: config.WORKER_LEASE_TIMEOUT_MS,
    maximumAttempts: config.WORKER_MAX_ATTEMPTS,
    retryDelayMs: config.WORKER_RETRY_DELAY_MS,
    processingDelayMs: config.WORKER_PROCESSING_DELAY_MS,
    claimJob: (jobId, currentWorkerId, leaseTimeoutMs) =>
      claimJobForSqsDelivery(database, jobId, currentWorkerId, leaseTimeoutMs),
    completeJob: (jobId, currentWorkerId) =>
      completeJob(database, jobId, currentWorkerId),
    recordFailure: (
      job,
      currentWorkerId,
      error,
      maximumAttempts,
      retryDelayMs,
    ) =>
      recordJobFailure(
        database,
        job,
        currentWorkerId,
        error,
        maximumAttempts,
        retryDelayMs,
      ),
    processJob,
    acknowledge,
    log: logger,
  });
}

async function runSqsWorker(signal: AbortSignal) {
  logger.info("SQS worker started", {
    workerId,
    receiveWaitSeconds: config.SQS_RECEIVE_WAIT_TIME_SECONDS,
    leaseTimeoutMs: config.WORKER_LEASE_TIMEOUT_MS,
  });

  while (!signal.aborted) {
    let message;
    try {
      message = await jobQueue.receiveOne(config.SQS_RECEIVE_WAIT_TIME_SECONDS);
    } catch (error) {
      logger.error("SQS receive failed", error, { workerId });
      await wait(config.WORKER_POLL_INTERVAL_MS, signal);
      continue;
    }

    if (!message) continue;

    try {
      await handleMessage(message);
    } catch (error) {
      logger.error("SQS delivery handling failed", error, {
        eventId: message.eventId,
        jobId: message.jobId,
        orderId: message.orderId,
        receiveCount: message.receiveCount,
      });
    }
  }
}

async function shutdown(signal: NodeJS.Signals) {
  if (shutdownController.signal.aborted) return;
  logger.info("Graceful shutdown started", { signal, workerId });
  shutdownController.abort();

  const forceExitTimer = setTimeout(() => {
    logger.error(
      "Graceful shutdown timed out",
      new Error("Shutdown deadline exceeded"),
      { workerId },
    );
    process.exit(1);
  }, config.SHUTDOWN_TIMEOUT_MS);
  forceExitTimer.unref();

  await workerPromise;
  await closeDatabase();
  clearTimeout(forceExitTimer);
  logger.info("Graceful shutdown completed", { workerId });
}

const workerPromise = runSqsWorker(shutdownController.signal);

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    void shutdown(signal).catch((error: unknown) => {
      logger.error("Graceful shutdown failed", error, { workerId });
      process.exitCode = 1;
    });
  });
}
