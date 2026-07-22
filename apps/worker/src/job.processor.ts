import type { ClaimedJob } from "./job.repository.js";

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function processJob(
  job: ClaimedJob,
  processingDelayMs: number,
): Promise<void> {
  if (job.type !== "fulfill_order") {
    throw new Error(`Unsupported job type: ${job.type}`);
  }

  await delay(processingDelayMs);

  const payload = job.payload as Record<string, unknown>;
  if (payload.simulateFailure === true) {
    throw new Error("Simulated fulfilment failure");
  }
}
