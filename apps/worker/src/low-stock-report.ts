export type LowStockItem = {
  productId: string;
  sku: string;
  name: string;
  availableQuantity: number;
};

export type CreateLowStockReportInput = {
  reportingPeriod: string;
  threshold: number;
  items: readonly LowStockItem[];
};

function assertReportingPeriod(reportingPeriod: string): void {
  const parsed = new Date(`${reportingPeriod}T00:00:00.000Z`);

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== reportingPeriod
  ) {
    throw new Error(
      "Reporting period must be a real calendar date in YYYY-MM-DD format",
    );
  }
}

function assertThreshold(threshold: number): void {
  if (!Number.isInteger(threshold) || threshold < 0) {
    throw new Error("Low-stock threshold must be a non-negative integer");
  }
}

export function createLowStockReportObjectKey(reportingPeriod: string): string {
  assertReportingPeriod(reportingPeriod);

  return `reports/low-stock/${reportingPeriod}.json`;
}

export function createLowStockReportDocument(
  input: CreateLowStockReportInput,
): string {
  assertReportingPeriod(input.reportingPeriod);
  assertThreshold(input.threshold);

  const items = [...input.items].sort((left, right) => {
    if (left.sku < right.sku) return -1;
    if (left.sku > right.sku) return 1;

    return left.productId.localeCompare(right.productId);
  });

  const report = {
    schemaVersion: 1,
    reportingPeriod: input.reportingPeriod,
    threshold: input.threshold,
    itemCount: items.length,
    items,
  };

  return `${JSON.stringify(report, null, 2)}\n`;
}
