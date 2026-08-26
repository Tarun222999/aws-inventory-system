import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import type { ClaimedOutboxMessage } from "./outbox.repository.js";

export type SqsOutboxPublisherConfig = {
  queueUrl: string;
  region: string;
  client?: SQSClient;
};

export type SqsOutboxPublisher = {
  publish(outboxMessage: ClaimedOutboxMessage): Promise<void>;
};

export function createSqsOutboxPublisher(
  config: SqsOutboxPublisherConfig,
): SqsOutboxPublisher {
  const client = config.client ?? new SQSClient({ region: config.region });

  return {
    async publish(outboxMessage) {
      await client.send(
        new SendMessageCommand({
          QueueUrl: config.queueUrl,
          MessageBody: JSON.stringify({
            eventId: outboxMessage.id,
            eventType: outboxMessage.messageType,
            jobId: outboxMessage.jobId,
            orderId: outboxMessage.orderId,
            payload: outboxMessage.payload,
          }),
          MessageAttributes: {
            eventId: {
              DataType: "String",
              StringValue: outboxMessage.id,
            },
            eventType: {
              DataType: "String",
              StringValue: outboxMessage.messageType,
            },
            jobId: {
              DataType: "String",
              StringValue: outboxMessage.jobId,
            },
            orderId: {
              DataType: "String",
              StringValue: outboxMessage.orderId,
            },
          },
        }),
      );
    },
  };
}
