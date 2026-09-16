import { SendEmailCommand, SESv2Client } from "@aws-sdk/client-sesv2";

import type { SendReportEmailInput } from "./low-stock-report.service.js";

export type LowStockReportEmailConfig = {
  region: string;
  fromEmailAddress: string;
  toEmailAddress: string;
};

export type LowStockReportEmailDependencies = {
  sendCommand?: (command: SendEmailCommand) => Promise<{ MessageId?: string }>;
};

export function createLowStockReportEmailNotifier(
  config: LowStockReportEmailConfig,
  dependencies: LowStockReportEmailDependencies = {},
) {
  const region = config.region.trim();
  const fromEmailAddress = config.fromEmailAddress.trim();
  const toEmailAddress = config.toEmailAddress.trim();

  if (!region) {
    throw new Error("Report email AWS Region is required");
  }

  if (!fromEmailAddress || !toEmailAddress) {
    throw new Error("Report sender and recipient are required");
  }

  const client = new SESv2Client({ region });

  const sendCommand =
    dependencies.sendCommand ??
    ((command: SendEmailCommand) => client.send(command));

  return {
    async sendReportEmail(input: SendReportEmailInput): Promise<void> {
      if (!Number.isInteger(input.itemCount) || input.itemCount < 0) {
        throw new Error("Report item count must be a non-negative integer");
      }

      const downloadUrl = new URL(input.downloadUrl);

      if (downloadUrl.protocol !== "https:") {
        throw new Error("Report download URL must use HTTPS");
      }

      const response = await sendCommand(
        new SendEmailCommand({
          FromEmailAddress: fromEmailAddress,
          Destination: {
            ToAddresses: [toEmailAddress],
          },
          Content: {
            Simple: {
              Subject: {
                Charset: "UTF-8",
                Data: `[TEST] Low-stock report — ${input.reportingPeriod}`,
              },
              Body: {
                Text: {
                  Charset: "UTF-8",
                  Data: [
                    "Your low-stock inventory report is ready.",
                    "",
                    `Reporting period: ${input.reportingPeriod}`,
                    `Low-stock products: ${input.itemCount}`,
                    `Download: ${input.downloadUrl}`,
                    "",
                    "This is a temporary, private download link.",
                    "This is an AWS learning test.",
                  ].join("\n"),
                },
              },
            },
          },
        }),
      );

      if (!response.MessageId) {
        throw new Error("Amazon SES did not return a MessageId");
      }
    },
  };
}
