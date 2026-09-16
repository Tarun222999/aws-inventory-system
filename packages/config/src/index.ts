export {
  resolveDatabaseEnvironment,
  resolveDatabaseSecretSnapshot,
} from "./runtime-database.js";

import { z } from "zod";

const sharedEnvironmentSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  DATABASE_URL: z.string().url().startsWith("postgresql://"),
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(20).default(5),
  DATABASE_SSL_CA_PATH: z.string().min(1).optional(),
  SHUTDOWN_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .min(1_000)
    .max(60_000)
    .default(10_000),
});

const apiEnvironmentSchema = sharedEnvironmentSchema.extend({
  API_HOST: z.string().min(1).default("127.0.0.1"),
  API_PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  APP_VERSION: z
    .string()
    .regex(/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/)
    .default("development"),
  PHASE4_HEALTH_MODE: z.enum(["healthy", "unhealthy"]).default("healthy"),
  PHASE4_MAX_SLOW_REQUEST_MS: z.coerce
    .number()
    .int()
    .min(1_000)
    .max(30_000)
    .default(20_000),
  AWS_REGION: z.string().min(1).default("ap-south-1"),
  PRODUCT_IMAGE_BUCKET: z
    .string()
    .min(3)
    .max(63)
    .regex(/^[a-z0-9][a-z0-9.-]*[a-z0-9]$/)
    .optional(),
  PRODUCT_IMAGE_UPLOAD_EXPIRES_SECONDS: z.coerce
    .number()
    .int()
    .min(30)
    .max(300)
    .default(60),
  PRODUCT_IMAGE_DOWNLOAD_EXPIRES_SECONDS: z.coerce
    .number()
    .int()
    .min(30)
    .max(300)
    .default(60),
});

const workerEnvironmentSchema = sharedEnvironmentSchema.extend({
  WORKER_POLL_INTERVAL_MS: z.coerce
    .number()
    .int()
    .min(100)
    .max(60_000)
    .default(1000),
  WORKER_LEASE_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .min(1_000)
    .max(3_600_000)
    .default(30_000),
  WORKER_RETRY_DELAY_MS: z.coerce
    .number()
    .int()
    .min(0)
    .max(60_000)
    .default(1_000),
  WORKER_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(20).default(3),
  WORKER_PROCESSING_DELAY_MS: z.coerce
    .number()
    .int()
    .min(0)
    .max(60_000)
    .default(250),
});

const outboxPublisherEnvironmentSchema = sharedEnvironmentSchema.extend({
  AWS_REGION: z.string().min(1).default("ap-south-1"),
  ORDER_PROCESSING_QUEUE_URL: z.string().url(),
  OUTBOX_POLL_INTERVAL_MS: z.coerce
    .number()
    .int()
    .min(100)
    .max(60_000)
    .default(1_000),
  OUTBOX_LEASE_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .min(1_000)
    .max(3_600_000)
    .default(30_000),
  OUTBOX_RETRY_DELAY_MS: z.coerce
    .number()
    .int()
    .min(0)
    .max(60_000)
    .default(1_000),
  ORDER_EVENT_BUS_NAME: z
    .string()
    .min(1)
    .max(256)
    .regex(/^[A-Za-z0-9._-]+$/),
});

const sqsWorkerEnvironmentSchema = workerEnvironmentSchema.extend({
  AWS_REGION: z.string().min(1).default("ap-south-1"),
  ORDER_PROCESSING_QUEUE_URL: z.string().url(),
  SQS_RECEIVE_WAIT_TIME_SECONDS: z.coerce
    .number()
    .int()
    .min(1)
    .max(20)
    .default(20),
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

export function loadOutboxPublisherConfig(
  environment: NodeJS.ProcessEnv = process.env,
) {
  const result = outboxPublisherEnvironmentSchema.safeParse(environment);

  if (!result.success) {
    throw formatConfigurationError(result.error);
  }

  return result.data;
}

export function loadSqsWorkerConfig(
  environment: NodeJS.ProcessEnv = process.env,
) {
  const result = sqsWorkerEnvironmentSchema.safeParse(environment);

  if (!result.success) {
    throw formatConfigurationError(result.error);
  }

  return result.data;
}

const lowStockReportEnvironmentSchema = sharedEnvironmentSchema.extend({
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(2).default(1),

  AWS_REGION: z.string().min(1).default("ap-south-1"),

  LOW_STOCK_REPORT_BUCKET: z
    .string()
    .min(3)
    .max(63)
    .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/),

  LOW_STOCK_THRESHOLD: z.coerce.number().int().min(0).max(1_000_000).default(5),

  LOW_STOCK_REPORT_FROM_EMAIL: z.string().email(),

  LOW_STOCK_REPORT_TO_EMAIL: z.string().email(),

  LOW_STOCK_REPORT_TIME_ZONE: z.string().min(1).default("Asia/Kolkata"),

  LOW_STOCK_REPORT_DOWNLOAD_EXPIRES_SECONDS: z.coerce
    .number()
    .int()
    .min(30)
    .max(900)
    .default(300),
});

export function loadLowStockReportConfig(
  environment: NodeJS.ProcessEnv = process.env,
) {
  const result = lowStockReportEnvironmentSchema.safeParse(environment);

  if (!result.success) {
    throw formatConfigurationError(result.error);
  }

  return result.data;
}
