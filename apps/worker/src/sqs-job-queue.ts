import {
  DeleteMessageCommand,
  ReceiveMessageCommand,
  SQSClient,
} from "@aws-sdk/client-sqs";

export type SqsJobEnvelope = {
  eventId: string;
  eventType: string;
  jobId: string;
  orderId: string;
  payload: unknown;
};

export type ReceivedJobMessage = SqsJobEnvelope & {
  receiptHandle: string;
  receiveCount: number;
};

export type SqsJobQueueConfig = {
  queueUrl: string;
  region: string;
  client?: SQSClient;
};

export type SqsJobQueue = {
  receiveOne(waitTimeSeconds: number): Promise<ReceivedJobMessage | undefined>;
  delete(receiptHandle: string): Promise<void>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredString(
  record: Record<string, unknown>,
  field: string,
): string {
  const value = record[field];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`SQS message ${field} must be a non-blank string`);
  }
  return value;
}

export function parseSqsJobEnvelope(body: string): SqsJobEnvelope {
  const parsed: unknown = JSON.parse(body);

  if (!isRecord(parsed)) {
    throw new Error("SQS message body must be a JSON object");
  }
  if (!Object.prototype.hasOwnProperty.call(parsed, "payload")) {
    throw new Error("SQS message payload is required");
  }

  return {
    eventId: requiredString(parsed, "eventId"),
    eventType: requiredString(parsed, "eventType"),
    jobId: requiredString(parsed, "jobId"),
    orderId: requiredString(parsed, "orderId"),
    payload: parsed.payload,
  };
}

export function createSqsJobQueue(config: SqsJobQueueConfig): SqsJobQueue {
  const client = config.client ?? new SQSClient({ region: config.region });

  return {
    async receiveOne(waitTimeSeconds) {
      const response = await client.send(
        new ReceiveMessageCommand({
          QueueUrl: config.queueUrl,
          MaxNumberOfMessages: 1,
          WaitTimeSeconds: waitTimeSeconds,
          MessageSystemAttributeNames: ["ApproximateReceiveCount"],
          MessageAttributeNames: ["All"],
        }),
      );

      const [message] = response.Messages ?? [];

      if (!message) return undefined;
      if (!message.ReceiptHandle) {
        throw new Error("SQS message receipt handle is missing");
      }
      if (message.Body === undefined) {
        throw new Error("SQS message body is missing");
      }

      const receiveCount = Number.parseInt(
        message.Attributes?.ApproximateReceiveCount ?? "1",
        10,
      );
      if (!Number.isSafeInteger(receiveCount) || receiveCount < 1) {
        throw new Error("SQS message receive count is invalid");
      }

      return {
        ...parseSqsJobEnvelope(message.Body),
        receiptHandle: message.ReceiptHandle,
        receiveCount,
      };
    },

    async delete(receiptHandle) {
      await client.send(
        new DeleteMessageCommand({
          QueueUrl: config.queueUrl,
          ReceiptHandle: receiptHandle,
        }),
      );
    },
  };
}
