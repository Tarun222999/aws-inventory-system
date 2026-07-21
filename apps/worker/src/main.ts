import { loadWorkerConfig } from "@order-platform/config";

const config = loadWorkerConfig();

console.log(
  JSON.stringify({
    level: "info",
    component: "worker",
    message: "Worker configuration validated",
    pollIntervalMs: config.WORKER_POLL_INTERVAL_MS,
    environment: config.NODE_ENV,
  }),
);

// Job polling and lifecycle hooks are added after the database foundation.
