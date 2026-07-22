import { randomUUID } from "node:crypto";

import { loadWorkerConfig } from "@order-platform/config";
import { createDatabase } from "@order-platform/database";
import { createLogger } from "@order-platform/logger";

import { processJob } from "./job.processor.js";
import {
  claimNextJob,
  completeJob,
  recordJobFailure,
} from "./job.repository.js";

const config = loadWorkerConfig();
const logger = createLogger("worker");
const workerId = `worker-${randomUUID()}`;
const { database, close: closeDatabase } = createDatabase(config.DATABASE_URL, {
  onPoolError: (error) => logger.error("Database pool error", error),
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

async function runWorker(signal: AbortSignal) {
  let databaseAvailable: boolean | undefined;
  logger.info("Worker started", {
    workerId,
    pollIntervalMs: config.WORKER_POLL_INTERVAL_MS,
    leaseTimeoutMs: config.WORKER_LEASE_TIMEOUT_MS,
    maximumAttempts: config.WORKER_MAX_ATTEMPTS,
  });

  while (!signal.aborted) {
    try {
      const job = await claimNextJob(
        database,
        workerId,
        config.WORKER_LEASE_TIMEOUT_MS,
      );
      if (databaseAvailable !== true) {
        logger.info(
          databaseAvailable === false
            ? "Worker database connection recovered"
            : "Worker database connection established",
        );
      }
      databaseAvailable = true;

      if (!job) {
        await wait(config.WORKER_POLL_INTERVAL_MS, signal);
        continue;
      }

      logger.info("Job claimed", {
        jobId: job.id,
        orderId: job.orderId,
        attempt: job.attempts,
      });

      try {
        await processJob(job, config.WORKER_PROCESSING_DELAY_MS);
        const completed = await completeJob(database, job.id, workerId);
        logger.info(completed ? "Job completed" : "Job completion lease lost", {
          jobId: job.id,
          orderId: job.orderId,
          attempt: job.attempts,
        });
      } catch (error) {
        const outcome = await recordJobFailure(
          database,
          job,
          workerId,
          error,
          config.WORKER_MAX_ATTEMPTS,
          config.WORKER_RETRY_DELAY_MS,
        );
        logger.error("Job processing failed", error, {
          jobId: job.id,
          orderId: job.orderId,
          attempt: job.attempts,
          outcome,
        });
      }
    } catch (error) {
      if (databaseAvailable !== false) {
        logger.error("Worker database connection unavailable", error);
      }
      databaseAvailable = false;
      await wait(config.WORKER_POLL_INTERVAL_MS, signal);
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

const workerPromise = runWorker(shutdownController.signal);

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    void shutdown(signal).catch((error: unknown) => {
      logger.error("Graceful shutdown failed", error, { workerId });
      process.exitCode = 1;
    });
  });
}
