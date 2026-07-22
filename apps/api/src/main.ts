import { randomUUID } from "node:crypto";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";

import { loadApiConfig } from "@order-platform/config";
import { checkDatabase, createDatabase } from "@order-platform/database";
import { createLogger } from "@order-platform/logger";

import { sendJson } from "./http/json.js";
import { handleOrderRoute } from "./modules/orders/order.routes.js";
import { handleProductRoute } from "./modules/products/product.routes.js";

const config = loadApiConfig();
const logger = createLogger("api");
const {
  database,
  pool,
  close: closeDatabase,
} = createDatabase(config.DATABASE_URL, {
  onPoolError: (error) => logger.error("Database pool error", error),
});

let shuttingDown = false;

async function handleRequest(
  request: IncomingMessage,
  response: ServerResponse,
) {
  const requestId = request.headers["x-request-id"] ?? randomUUID();
  response.setHeader("x-request-id", requestId);

  if (request.method === "GET" && request.url === "/health") {
    sendJson(response, 200, { status: "ok" });
    return;
  }

  if (request.method === "GET" && request.url === "/ready") {
    if (shuttingDown) {
      sendJson(response, 503, { status: "not_ready", reason: "shutting_down" });
      return;
    }

    try {
      await checkDatabase(pool);
      sendJson(response, 200, { status: "ready" });
    } catch (error) {
      logger.error("Readiness check failed", error, { requestId });
      sendJson(response, 503, {
        status: "not_ready",
        reason: "database_unavailable",
      });
    }
    return;
  }

  if (
    await handleProductRoute(request, response, {
      database,
      logger,
      requestId,
    })
  ) {
    return;
  }

  if (
    await handleOrderRoute(request, response, {
      database,
      logger,
      requestId,
    })
  ) {
    return;
  }

  sendJson(response, 404, {
    error: {
      code: "route_not_found",
      message: "Route not found",
    },
  });
}

const server = createServer((request, response) => {
  void handleRequest(request, response).catch((error: unknown) => {
    logger.error("Unhandled request failure", error);
    if (!response.headersSent) {
      sendJson(response, 500, {
        error: {
          code: "internal_error",
          message: "An unexpected error occurred",
        },
      });
      return;
    }
    response.destroy();
  });
});

server.listen(config.API_PORT, "127.0.0.1", () => {
  logger.info("API listening", {
    host: "127.0.0.1",
    port: config.API_PORT,
    environment: config.NODE_ENV,
  });
});

async function shutdown(signal: NodeJS.Signals) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info("Graceful shutdown started", { signal });

  const forceExitTimer = setTimeout(() => {
    logger.error(
      "Graceful shutdown timed out",
      new Error("Shutdown deadline exceeded"),
    );
    process.exit(1);
  }, config.SHUTDOWN_TIMEOUT_MS);
  forceExitTimer.unref();

  server.closeIdleConnections();
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  await closeDatabase();
  clearTimeout(forceExitTimer);
  logger.info("Graceful shutdown completed");
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    void shutdown(signal).catch((error: unknown) => {
      logger.error("Graceful shutdown failed", error);
      process.exitCode = 1;
    });
  });
}
