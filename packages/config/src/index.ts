import { z } from "zod";

const sharedEnvironmentSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  DATABASE_URL: z.string().url().startsWith("postgresql://"),
  SHUTDOWN_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .min(1_000)
    .max(60_000)
    .default(10_000),
});

const apiEnvironmentSchema = sharedEnvironmentSchema.extend({
  API_PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
});

const workerEnvironmentSchema = sharedEnvironmentSchema.extend({
  WORKER_POLL_INTERVAL_MS: z.coerce
    .number()
    .int()
    .min(100)
    .max(60_000)
    .default(1000),
});

function formatConfigurationError(error: z.ZodError): Error {
  const details = error.issues
    .map(
      (issue) => `${issue.path.join(".") || "environment"}: ${issue.message}`,
    )
    .join("; ");

  return new Error(`Invalid application configuration: ${details}`);
}

export function loadApiConfig(environment: NodeJS.ProcessEnv = process.env) {
  const result = apiEnvironmentSchema.safeParse(environment);

  if (!result.success) {
    throw formatConfigurationError(result.error);
  }

  return result.data;
}

export function loadWorkerConfig(environment: NodeJS.ProcessEnv = process.env) {
  const result = workerEnvironmentSchema.safeParse(environment);

  if (!result.success) {
    throw formatConfigurationError(result.error);
  }

  return result.data;
}
