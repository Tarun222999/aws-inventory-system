import { and, asc, eq, lt, lte, or, sql } from "drizzle-orm";

import { outboxMessages, type Database } from "@order-platform/database";

export type ClaimedOutboxMessage = typeof outboxMessages.$inferSelect;

export async function claimNextOutboxMessage(
  database: Database,
  publisherId: string,
  leaseTimeoutMs: number,
  now = new Date(),
): Promise<ClaimedOutboxMessage | undefined> {
  const staleBefore = new Date(now.getTime() - leaseTimeoutMs);

  return database.transaction(async (transaction) => {
    const [candidate] = await transaction
      .select()
      .from(outboxMessages)
      .where(
        or(
          and(
            eq(outboxMessages.status, "pending"),
            lte(outboxMessages.availableAt, now),
          ),
          and(
            eq(outboxMessages.status, "publishing"),
            lt(outboxMessages.lockedAt, staleBefore),
          ),
        ),
      )
      .orderBy(
        asc(outboxMessages.availableAt),
        asc(outboxMessages.createdAt),
        asc(outboxMessages.id),
      )
      .limit(1)
      .for("update", { skipLocked: true });

    if (!candidate) return undefined;

    const [claimed] = await transaction
      .update(outboxMessages)
      .set({
        status: "publishing",
        publishAttempts: sql`${outboxMessages.publishAttempts} + 1`,
        lockedAt: now,
        lockedBy: publisherId,
        lastError: null,
        updatedAt: now,
      })
      .where(eq(outboxMessages.id, candidate.id))
      .returning();

    return claimed;
  });
}

export async function markOutboxPublished(
  database: Database,
  outboxMessageId: string,
  publisherId: string,
  now = new Date(),
): Promise<boolean> {
  const [published] = await database
    .update(outboxMessages)
    .set({
      status: "published",
      lockedAt: null,
      lockedBy: null,
      publishedAt: now,
      lastError: null,
      updatedAt: now,
    })
    .where(
      and(
        eq(outboxMessages.id, outboxMessageId),
        eq(outboxMessages.status, "publishing"),
        eq(outboxMessages.lockedBy, publisherId),
      ),
    )
    .returning({ id: outboxMessages.id });

  return published != undefined;
}

export async function releaseOutboxForRetry(
  database: Database,
  outboxMessageId: string,
  publisherId: string,
  error: unknown,
  retryDelayMs: number,
  now = new Date(),
): Promise<boolean> {
  const message = error instanceof Error ? error.message : String(error);

  const [released] = await database
    .update(outboxMessages)
    .set({
      status: "pending",
      lockedAt: null,
      lockedBy: null,
      availableAt: new Date(now.getTime() + retryDelayMs),
      lastError: message.slice(0, 4_000),
      updatedAt: now,
    })
    .where(
      and(
        eq(outboxMessages.id, outboxMessageId),
        eq(outboxMessages.status, "publishing"),
        eq(outboxMessages.lockedBy, publisherId),
      ),
    )
    .returning({ id: outboxMessages.id });

  return released != undefined;
}
