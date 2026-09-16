export type LowStockReportRunner = {
  run(reportingPeriod: string): Promise<unknown>;
};

export type LowStockReportHandlerConfig = {
  timeZone: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function reportingPeriodInTimeZone(
  scheduledTime: string,
  timeZone: string,
): string {
  const date = new Date(scheduledTime);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Scheduled time must be a valid timestamp");
  }

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  const year = values.year;
  const month = values.month;
  const day = values.day;

  if (!year || !month || !day) {
    throw new Error("Could not derive the reporting period");
  }

  return `${year}-${month}-${day}`;
}

export function createLowStockReportHandler(
  config: LowStockReportHandlerConfig,
  runner: LowStockReportRunner,
) {
  // Constructing this formatter validates the configured time zone.
  new Intl.DateTimeFormat("en-US", {
    timeZone: config.timeZone,
  });

  return async function handle(event: unknown) {
    if (!isRecord(event)) {
      throw new Error("Scheduled report input must be an object");
    }

    if (
      typeof event.reportingPeriod === "string" &&
      event.reportingPeriod.trim()
    ) {
      return runner.run(event.reportingPeriod.trim());
    }

    if (typeof event.scheduledTime === "string" && event.scheduledTime.trim()) {
      const reportingPeriod = reportingPeriodInTimeZone(
        event.scheduledTime,
        config.timeZone,
      );

      return runner.run(reportingPeriod);
    }

    throw new Error(
      "Scheduled report input requires reportingPeriod or scheduledTime",
    );
  };
}
