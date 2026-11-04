import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import {
  ORDER_CONFIRMED_DETAIL_TYPE,
  ORDER_EVENT_SOURCE,
  orderConfirmedDetailV1Schema,
} from "@order-platform/events";

const ses = new SESv2Client({});

export async function handler(event: {
  source?: string;
  "detail-type"?: string;
  detail?: unknown;
}): Promise<void> {
  if (
    event.source !== ORDER_EVENT_SOURCE ||
    event["detail-type"] !== ORDER_CONFIRMED_DETAIL_TYPE
  ) {
    throw new Error("Unexpected order confirmation event");
  }

  const { order } = orderConfirmedDetailV1Schema.parse(event.detail);
  const inbox = process.env.ORDER_EMAIL_TEST_INBOX;
  if (!inbox) throw new Error("Missing order email test inbox");

  const total = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: order.currency,
  }).format(order.totalPaise / 100);

  await ses.send(
    new SendEmailCommand({
      FromEmailAddress: inbox,
      Destination: { ToAddresses: [inbox] },
      Content: {
        Simple: {
          Subject: { Data: "Stockroom order confirmed" },
          Body: {
            Text: {
              Data: `Order ${order.id} is ready to ship. Total: ${total}.`,
            },
          },
        },
      },
    }),
  );
}
