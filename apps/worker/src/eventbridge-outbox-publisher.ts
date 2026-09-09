import {
  EventBridgeClient,
  PutEventsCommand,
} from "@aws-sdk/client-eventbridge";
import type { ClaimedOutboxMessage } from "./outbox.repository.js";
import {
  createOrderConfirmedPublicationV1,
  ORDER_CONFIRMED_DETAIL_TYPE,
} from "@order-platform/events";

export type EventBridgeOutboxPublisherConfig = {
  eventBusName: string;
  region: string;
  client?: EventBridgeClient;
};

export type EventBridgeOutboxPublisher = {
  publish(outboxMessage: ClaimedOutboxMessage): Promise<void>;
};

export function createEventBridgeOutboxPublisher(
  config: EventBridgeOutboxPublisherConfig,
): EventBridgeOutboxPublisher {
  const client =
    config.client ?? new EventBridgeClient({ region: config.region });
  return {
    async publish(outboxMessage) {
      if (outboxMessage.messageType !== ORDER_CONFIRMED_DETAIL_TYPE) {
        throw new Error(
          `Unsupported EventBridge message type: ${outboxMessage.messageType}`,
        );
      }

      const publication = createOrderConfirmedPublicationV1(
        outboxMessage.payload,
      );

      if (publication.detail.eventId !== outboxMessage.id) {
        throw new Error("EventId does not match the outbox messageId");
      }

      if (publication.detail.order.id !== outboxMessage.orderId) {
        throw new Error("Event order ID does not match the outbox order ID");
      }

      const response = await client.send(
        new PutEventsCommand({
          Entries: [
            {
              EventBusName: config.eventBusName,
              Source: publication.source,
              DetailType: publication.detailType,
              Time: publication.time,
              Detail: JSON.stringify(publication.detail),
            },
          ],
        }),
      );

      const result = response.Entries?.[0];

      if ((response.FailedEntryCount ?? 0) > 0 || result?.ErrorCode) {
        throw new Error(
          `EventBridge rejected event ${outboxMessage.id}: ${
            result?.ErrorCode ?? "UnknownError"
          }${result?.ErrorMessage ? `: ${result.ErrorMessage}` : ""}`,
        );
      }
    },
  };
}
