import assert from "node:assert/strict";
import { after, test } from "node:test";

import { eq } from "drizzle-orm";

import {
  createDatabase,
  jobs,
  orders,
  outboxMessages,
} from "@order-platform/database";

import {
  claimNextOutboxMessage,
  markOutboxPublished,
  releaseOutboxForRetry,
} from "./outbox.repository.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl)
  throw new Error("DATABASE_URL is required for integration tests");

const connection = createDatabase(databaseUrl, {
  applicationName: "order-platform-outbox-test",
  maxConnections: 5,
  onPoolError: (error) => console.error(error),
});

after(async () => connection.close());

async function createTestOutboxMessage(
  overrides: Partial<typeof outboxMessages.$inferInsert> = {},
) {
  return connection.database.transaction(async (transaction) => {
    const [order] = await transaction
      .insert(orders)
      .values({ totalPaise: 100 })
      .returning();
    assert.ok(order);

    const [job] = await transaction
      .insert(jobs)
      .values({
        orderId: order.id,
        type: "fulfill_order",
        payload: { orderId: order.id },
      })
      .returning();
    assert.ok(job);

    const [outboxMessage] = await transaction
      .insert(outboxMessages)
      .values({
        jobId: job.id,
        orderId: order.id,
        messageType: "fulfill_order",
        payload: { jobId: job.id, orderId: order.id },
        ...overrides,
      })
      .returning();
    assert.ok(outboxMessage);

    return { order, job, outboxMessage };
  });
}

async function cleanupOrder(orderId: string) {
  await connection.database.delete(orders).where(eq(orders.id, orderId));
}

void test("only one publisher can claim and publish an outbox message", async () => {
  const fixture = await createTestOutboxMessage();
  try {
    const claims = await Promise.all([
      claimNextOutboxMessage(connection.database, "publisher-a", 30_000),
      claimNextOutboxMessage(connection.database, "publisher-b", 30_000),
    ]);
    const claimed = claims.filter((claim) => claim !== undefined);
    assert.equal(claimed.length, 1);

    const message = claimed[0];
    assert.ok(message);
    assert.equal(message.id, fixture.outboxMessage.id);
    assert.equal(message.publishAttempts, 1);
    assert.ok(message.lockedBy);

    assert.equal(
      await markOutboxPublished(
        connection.database,
        message.id,
        "wrong-publisher",
      ),
      false,
    );
    assert.equal(
      await markOutboxPublished(
        connection.database,
        message.id,
        message.lockedBy,
      ),
      true,
    );

    const [published] = await connection.database
      .select()
      .from(outboxMessages)
      .where(eq(outboxMessages.id, message.id));
    assert.equal(published?.status, "published");
    assert.equal(published?.lockedAt, null);
    assert.equal(published?.lockedBy, null);
    assert.ok(published?.publishedAt);
  } finally {
    await cleanupOrder(fixture.order.id);
  }
});

void test("releases a known send failure for retry", async () => {
  const fixture = await createTestOutboxMessage();
  try {
    const claimed = await claimNextOutboxMessage(
      connection.database,
      "retry-publisher",
      30_000,
    );
    assert.ok(claimed);

    assert.equal(
      await releaseOutboxForRetry(
        connection.database,
        claimed.id,
        "wrong-publisher",
        new Error("temporary SQS failure"),
        0,
      ),
      false,
    );
    assert.equal(
      await releaseOutboxForRetry(
        connection.database,
        claimed.id,
        "retry-publisher",
        new Error("temporary SQS failure"),
        0,
      ),
      true,
    );

    const recovered = await claimNextOutboxMessage(
      connection.database,
      "retry-publisher",
      30_000,
    );
    assert.equal(recovered?.id, claimed.id);
    assert.equal(recovered?.publishAttempts, 2);
  } finally {
    await cleanupOrder(fixture.order.id);
  }
});

void test("a new publisher recovers an expired publishing lease", async () => {
  const oldLock = new Date(Date.now() - 60_000);
  const fixture = await createTestOutboxMessage({
    status: "publishing",
    publishAttempts: 1,
    lockedAt: oldLock,
    lockedBy: "dead-publisher",
  });
  try {
    const recovered = await claimNextOutboxMessage(
      connection.database,
      "replacement-publisher",
      30_000,
    );
    assert.equal(recovered?.id, fixture.outboxMessage.id);
    assert.equal(recovered?.lockedBy, "replacement-publisher");
    assert.equal(recovered?.publishAttempts, 2);
  } finally {
    await cleanupOrder(fixture.order.id);
  }
});
