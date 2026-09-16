import { SendEmailCommand, SESv2Client } from "@aws-sdk/client-sesv2";
import { orderConfirmedDetailV1Schema } from "@order-platform/events";

export type SendSesCommand = (
  command: SendEmailCommand,
) => Promise<{ MessageId?: string }>;

export type SesOrderConfirmedConsumerConfig = {
  region: string;
  fromEmailAddress: string;
  toEmailAddress: string;
  sendCommand?: SendSesCommand;
};

export function createSesOrderConfirmedConsumer(
  config: SesOrderConfirmedConsumerConfig,
) {
  const client = new SESv2Client({
    region: config.region,
  });

  const sendCommand =
    config.sendCommand ?? ((command: SendEmailCommand) => client.send(command));

  return {
    async handle(detail: unknown): Promise<string> {
      const event = orderConfirmedDetailV1Schema.parse(detail);

      const formattedTotal = new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: event.order.currency,
      }).format(event.order.totalPaise / 100);

      const command = new SendEmailCommand({
        FromEmailAddress: config.fromEmailAddress,
        Destination: {
          ToAddresses: [config.toEmailAddress],
        },
        Content: {
          Simple: {
            Subject: {
              Charset: "UTF-8",
              Data: "[TEST] Your order is confirmed — AWS learning",
            },
            Body: {
              Text: {
                Charset: "UTF-8",
                Data: [
                  "Your order has been confirmed.",
                  "",
                  `Order ID: ${event.order.id}`,
                  `Total: ${formattedTotal}`,
                  `Event ID: ${event.eventId}`,
                  "",
                  "This is an AWS learning test. No action is required.",
                ].join("\n"),
              },
            },
          },
        },
      });

      const response = await sendCommand(command);

      if (!response.MessageId) {
        throw new Error("Amazon SES did not return a MessageId");
      }

      return response.MessageId;
    },
  };
}
