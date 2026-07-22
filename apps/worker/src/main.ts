import { loadWorkerConfig } from "@order-platform/config";
import { checkDatabase, createDatabase } from "@order-platform/database";
import { createLogger } from "@order-platform/logger";

const config = loadWorkerConfig();
const logger = createLogger("worker");
const { pool, close: closeDatabase } = createDatabase(config.DATABASE_URL, {
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
    pollIntervalMs: config.WORKER_POLL_INTERVAL_MS,
    environment: config.NODE_ENV,
  });

  while (!signal.aborted) {
    try {
      await checkDatabase(pool);
      if (databaseAvailable !== true) {
        logger.info(
          databaseAvailable === false
            ? "Worker database connection recovered"
            : "Worker database connection established",
        );
      }
      databaseAvailable = true;
    } catch (error) {
      if (databaseAvailable !== false) {
        logger.error("Worker database connection unavailable", error);
      }
      databaseAvailable = false;
    }

    await wait(config.WORKER_POLL_INTERVAL_MS, signal);
  }
}

async function shutdown(signal: NodeJS.Signals) {
  if (shutdownController.signal.aborted) return;
  logger.info("Graceful shutdown started", { signal });
  shutdownController.abort();

  const forceExitTimer = setTimeout(() => {
    logger.error(
      "Graceful shutdown timed out",
      new Error("Shutdown deadline exceeded"),
    );
    process.exit(1);
  }, config.SHUTDOWN_TIMEOUT_MS);
  forceExitTimer.unref();

  await workerPromise;
  await closeDatabase();
  clearTimeout(forceExitTimer);
  logger.info("Graceful shutdown completed");
}

const workerPromise = runWorker(shutdownController.signal);

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    void shutdown(signal).catch((error: unknown) => {
      logger.error("Graceful shutdown failed", error);
      process.exitCode = 1;
    });
  });
}
