import type { ClaimedJob, SqsJobClaim } from "./job.repository.js";
import type { ReceivedJobMessage } from "./sqs-job-queue.js";

type Details = Record<string, unknown>;

export type SqsJobDeliveryDependencies = {
  workerId: string;
  leaseTimeoutMs: number;
  maximumAttempts: number;
  retryDelayMs: number;
  processingDelayMs: number;
  claimJob: (
    jobId: string,
    workerId: string,
    leaseTimeoutMs: number,
  ) => Promise<SqsJobClaim>;
  completeJob: (jobId: string, workerId: string) => Promise<boolean>;
  recordFailure: (
    job: ClaimedJob,
    workerId: string,
    error: unknown,
    maximumAttempts: number,
    retryDelayMs: number,
  ) => Promise<string>;
  processJob: (job: ClaimedJob, processingDelayMs: number) => Promise<void>;
  acknowledge: (receiptHandle: string, details: Details) => Promise<void>;
  log: {
    info: (message: string, details: Details) => void;
    error: (message: string, error: unknown, details: Details) => void;
  };
};

function detailsFor(message: ReceivedJobMessage): Details {
  return {
    eventId: message.eventId,
    jobId: message.jobId,
    orderId: message.orderId,
    receiveCount: message.receiveCount,
  };
}

export async function handleSqsJobDelivery(
  message: ReceivedJobMessage,
  dependencies: SqsJobDeliveryDependencies,
): Promise<void> {
  const details = detailsFor(message);

  if (message.eventType !== "fulfill_order") {
    dependencies.log.error(
      "Unsupported SQS event type; delivery left for retry or DLQ",
      new Error(`Unsupported event type: ${message.eventType}`),
      details,
    );
    return;
  }

  const claim = await dependencies.claimJob(
    message.jobId,
    dependencies.workerId,
    dependencies.leaseTimeoutMs,
  );

  if (claim.kind === "already_completed") {
    await dependencies.acknowledge(message.receiptHandle, {
      ...details,
      outcome: "duplicate_completed",
    });
    return;
  }

  if (claim.kind === "not_claimable") {
    dependencies.log.info("SQS delivery left for retry or DLQ", details);
    return;
  }

  const { job } = claim;
  dependencies.log.info("SQS job claimed", {
    ...details,
    attempt: job.attempts,
  });

  if (job.orderId !== message.orderId) {
    const error = new Error("SQS message order ID does not match the job");
    const outcome = await dependencies.recordFailure(
      job,
      dependencies.workerId,
      error,
      dependencies.maximumAttempts,
      dependencies.retryDelayMs,
    );
    dependencies.log.error("SQS job correlation mismatch", error, {
      ...details,
      attempt: job.attempts,
      outcome,
    });
    return;
  }

  try {
    await dependencies.processJob(job, dependencies.processingDelayMs);
  } catch (error) {
    const outcome = await dependencies.recordFailure(
      job,
      dependencies.workerId,
      error,
      dependencies.maximumAttempts,
      dependencies.retryDelayMs,
    );
    dependencies.log.error("SQS job processing failed", error, {
      ...details,
      attempt: job.attempts,
      outcome,
    });
    return;
  }

  const completed = await dependencies.completeJob(
    job.id,
    dependencies.workerId,
  );
  if (!completed) {
    dependencies.log.info(
      "SQS job completion lease lost; delivery not acknowledged",
      {
        ...details,
        attempt: job.attempts,
      },
    );
    return;
  }

  await dependencies.acknowledge(message.receiptHandle, {
    ...details,
    attempt: job.attempts,
    outcome: "completed",
  });
}
