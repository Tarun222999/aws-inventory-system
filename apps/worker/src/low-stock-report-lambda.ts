import {
  loadLowStockReportConfig,
  resolveDatabaseEnvironment,
} from "@order-platform/config";
import { createDatabase } from "@order-platform/database";
import { createLogger } from "@order-platform/logger";
import { createLowStockReportStorage } from "./low-stock-report.storage.js";
import { createLowStockReportEmailNotifier } from "./low-stock-report.email.js";
import { createLowStockReportService } from "./low-stock-report.service.js";
import { listLowStockItems } from "./low-stock-report.repository.js";
import { createLowStockReportHandler } from "./low-stock-report.handler.js";

const logger = createLogger("low-stock-report");
const environment = await resolveDatabaseEnvironment();
const config = loadLowStockReportConfig(environment);

const { database } = createDatabase(config.DATABASE_URL, {
  applicationName: "order-platform-low-stock-report",
  maxConnections: config.DATABASE_POOL_MAX,
  onPoolError: (error) => logger.error("Database pool error", error),
  ...(config.DATABASE_SSL_CA_PATH
    ? {
        sslCertificateAuthorityPath: config.DATABASE_SSL_CA_PATH,
      }
    : {}),
});

const storage = createLowStockReportStorage({
  bucketName: config.LOW_STOCK_REPORT_BUCKET,
  region: config.AWS_REGION,
  downloadExpiresInSeconds: config.LOW_STOCK_REPORT_DOWNLOAD_EXPIRES_SECONDS,
});

const emailNotifier = createLowStockReportEmailNotifier({
  region: config.AWS_REGION,
  fromEmailAddress: config.LOW_STOCK_REPORT_FROM_EMAIL,
  toEmailAddress: config.LOW_STOCK_REPORT_TO_EMAIL,
});

const service = createLowStockReportService(
  {
    threshold: config.LOW_STOCK_THRESHOLD,
  },
  {
    listLowStockItems: (threshold) => listLowStockItems(database, threshold),

    storeReport: (input) => storage.storeReport(input),

    createDownloadUrl: (objectKey) => storage.createDownloadUrl(objectKey),

    sendReportEmail: (input) => emailNotifier.sendReportEmail(input),
  },
);

const reportHandler = createLowStockReportHandler(
  {
    timeZone: config.LOW_STOCK_REPORT_TIME_ZONE,
  },
  service,
);

export async function handler(event: unknown): Promise<unknown> {
  logger.info("Low-stock report invocation started");

  try {
    const result = await reportHandler(event);

    logger.info("Low-stock report invocation completed");

    return result;
  } catch (error) {
    logger.error("Low-stock report invocation failed", error);

    throw error;
  }
}
