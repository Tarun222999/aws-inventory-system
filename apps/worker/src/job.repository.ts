import { and, asc, eq, lt, lte, or, sql } from "drizzle-orm";

import { jobs, orders, type Database } from "@order-platform/database";

export type ClaimedJob = typeof jobs.$inferSelect;

export async function claimNextJob(
  database: Database,
  workerId: string,
  leaseTimeoutMs: number,
  now = new Date(),
): Promise<ClaimedJob | undefined> {
  const staleBefore = new Date(now.getTime() - leaseTimeoutMs);

  return database.transaction(async (transaction) => {
    const [candidate] = await transaction
      .select()
      .from(jobs)
      .where(
        or(
          and(eq(jobs.status, "pending"), lte(jobs.availableAt, now)),
          and(eq(jobs.status, "processing"), lt(jobs.lockedAt, staleBefore)),
        ),
      )
      .orderBy(asc(jobs.availableAt), asc(jobs.createdAt), asc(jobs.id))
      .limit(1)
      .for("update", { skipLocked: true });

    if (!candidate) return undefined;

    const [claimed] = await transaction
      .update(jobs)
      .set({
        status: "processing",
        attempts: sql`${jobs.attempts} + 1`,
        lockedAt: now,
        lockedBy: workerId,
        lastError: null,
        updatedAt: now,
      })
      .where(eq(jobs.id, candidate.id))
      .returning();

    if (!claimed) return undefined;
    await transaction
      .update(orders)
      .set({ status: "processing", updatedAt: now })
      .where(eq(orders.id, claimed.orderId));
    return claimed;
  });
}

export async function completeJob(
  database: Database,
  jobId: string,
  workerId: string,
  now = new Date(),
): Promise<boolean> {
  return database.transaction(async (transaction) => {
    const [completed] = await transaction
      .update(jobs)
      .set({
        status: "completed",
        lockedAt: null,
        lockedBy: null,
        lastError: null,
        updatedAt: now,
      })
      .where(
        and(
          eq(jobs.id, jobId),
          eq(jobs.status, "processing"),
          eq(jobs.lockedBy, workerId),
        ),
      )
      .returning({ orderId: jobs.orderId });

    if (!completed) return false;
    await transaction
      .update(orders)
      .set({ status: "ready_to_ship", updatedAt: now })
      .where(eq(orders.id, completed.orderId));
    return true;
  });
}

export async function recordJobFailure(
  database: Database,
  job: ClaimedJob,
  workerId: string,
  error: unknown,
  maximumAttempts: number,
  retryDelayMs: number,
  now = new Date(),
): Promise<"retry_scheduled" | "failed" | "lease_lost"> {
  const terminal = job.attempts >= maximumAttempts;
  const message = error instanceof Error ? error.message : String(error);

  return database.transaction(async (transaction) => {
    const [updated] = await transaction
      .update(jobs)
      .set({
        status: terminal ? "failed" : "pending",
        availableAt: terminal
          ? job.availableAt
          : new Date(now.getTime() + retryDelayMs),
        lockedAt: null,
        lockedBy: null,
        lastError: message.slice(0, 4_000),
        updatedAt: now,
      })
      .where(
        and(
          eq(jobs.id, job.id),
          eq(jobs.status, "processing"),
          eq(jobs.lockedBy, workerId),
        ),
      )
      .returning({ orderId: jobs.orderId });

    if (!updated) return "lease_lost";
    await transaction
      .update(orders)
      .set({ status: terminal ? "failed" : "pending", updatedAt: now })
      .where(eq(orders.id, updated.orderId));
    return terminal ? "failed" : "retry_scheduled";
  });
}
