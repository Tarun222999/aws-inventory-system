import {
  createLowStockReportDocument,
  createLowStockReportObjectKey,
  type LowStockItem,
} from "./low-stock-report.js";

export type StoreReportInput = {
  objectKey: string;
  body: string;
  contentType: "application/json";
};

export type StoreReportOutcome = "created" | "already-exists";

export type SendReportEmailInput = {
  reportingPeriod: string;
  itemCount: number;
  downloadUrl: string;
};

export type LowStockReportServiceDependencies = {
  listLowStockItems(threshold: number): Promise<readonly LowStockItem[]>;
  storeReport(input: StoreReportInput): Promise<StoreReportOutcome>;

  createDownloadUrl(objectKey: string): Promise<string>;

  sendReportEmail(input: SendReportEmailInput): Promise<void>;
};

export type LowStockReportServiceConfig = {
  threshold: number;
};

export function createLowStockReportService(
  config: LowStockReportServiceConfig,
  dependencies: LowStockReportServiceDependencies,
) {
  return {
    async run(reportingPeriod: string) {
      //list low stock inventory
      const items = await dependencies.listLowStockItems(config.threshold);

      const objectKey = createLowStockReportObjectKey(reportingPeriod);

      const body = createLowStockReportDocument({
        reportingPeriod,
        threshold: config.threshold,
        items,
      });

      const storageOutcome = await dependencies.storeReport({
        objectKey,
        body,
        contentType: "application/json",
      });

      const downloadUrl = await dependencies.createDownloadUrl(objectKey);

      await dependencies.sendReportEmail({
        reportingPeriod,
        itemCount: items.length,
        downloadUrl,
      });

      return {
        reportingPeriod,
        objectKey,
        itemCount: items.length,
        storageOutcome,
      };
    },
  };
}
