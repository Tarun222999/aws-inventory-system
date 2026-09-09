import { ORDER_CONFIRMED_DETAIL_TYPE } from "@order-platform/events";
import type { ClaimedOutboxMessage } from "./outbox.repository.js";

export type OutboxMessagePublisher = {
  publish(outboxMessage: ClaimedOutboxMessage): Promise<void>;
};

export type OutboxMessageRouterConfig = {
  sqsPublisher: OutboxMessagePublisher;
  eventBridgePublisher: OutboxMessagePublisher;
};

export function createOutboxMessageRouter(
  config: OutboxMessageRouterConfig,
): OutboxMessagePublisher {
  return {
    async publish(outboxMessage) {
      switch (outboxMessage.messageType) {
        case "fulfill_order":
          await config.sqsPublisher.publish(outboxMessage);
          return;
        case ORDER_CONFIRMED_DETAIL_TYPE:
          await config.eventBridgePublisher.publish(outboxMessage);
          return;

        default:
          throw new Error(
            `Unsupported outbox message type: ${outboxMessage.messageType}`,
          );
      }
    },
  };
}
