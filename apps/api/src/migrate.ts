import { fileURLToPath } from "node:url";

import {
  loadApiConfig,
  resolveDatabaseEnvironment,
} from "@order-platform/config";

import { runDatabaseMigrations } from "./migration-runner.js";

function log(
  level: "info" | "error",
  event: string,
  fields: Record<string, unknown> = {},
) {
  const entry = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    component: "migration-runner",
    event,
    ...fields,
  });
  if (level === "error") console.error(entry);
  else console.log(entry);
}

function safeError(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return { errorName: "UnknownError" };
  }
  return {
    errorCode:
      "code" in error && typeof error.code === "string"
        ? error.code
        : undefined,
    errorName:
      "name" in error && typeof error.name === "string"
        ? error.name
        : "UnknownError",
  };
}

async function main() {
  const environment = await resolveDatabaseEnvironment();
  const config = loadApiConfig(environment);
  if (!config.DATABASE_SSL_CA_PATH) {
    throw new Error("DATABASE_SSL_CA_PATH is required for database migrations");
  }

  await runDatabaseMigrations({
    databaseUrl: config.DATABASE_URL,
    migrationsFolder: fileURLToPath(
      new URL("../../../packages/database/migrations", import.meta.url),
    ),
    sslCertificateAuthorityPath: config.DATABASE_SSL_CA_PATH,
    log,
  });
}

void main().catch((error: unknown) => {
  log("error", "migration.failed", safeError(error));
  process.exitCode = 1;
});
