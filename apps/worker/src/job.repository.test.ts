import assert from "node:assert/strict";
import { after, test } from "node:test";

import { eq } from "drizzle-orm";

import { createDatabase, jobs, orders } from "@order-platform/database";

import {
  claimJobForSqsDelivery,
  claimNextJob,
  completeJob,
  recordJobFailure,
} from "./job.repository.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl)
  throw new Error("DATABASE_URL is required for integration tests");

const connection = createDatabase(databaseUrl, {
  applicationName: "order-platform-worker-test",
  maxConnections: 5,
  onPoolError: (error) => console.error(error),
});

after(async () => connection.close());

async function createTestJob(
  overrides: Partial<typeof jobs.$inferInsert> = {},
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
        ...overrides,
      })
      .returning();
    assert.ok(job);
    return { order, job };
  });
}

async function cleanupOrder(orderId: string) {
  await connection.database.delete(orders).where(eq(orders.id, orderId));
}

void test("only one worker can claim a pending job", async () => {
  const fixture = await createTestJob();
  try {
    const claims = await Promise.all([
      claimNextJob(connection.database, "worker-a", 30_000),
      claimNextJob(connection.database, "worker-b", 30_000),
    ]);
    const claimed = claims.filter((claim) => claim !== undefined);
    assert.equal(claimed.length, 1);
    assert.equal(claimed[0]?.attempts, 1);

    const owner = claimed[0]?.lockedBy;
    assert.ok(owner);
    assert.equal(
      await completeJob(connection.database, fixture.job.id, "wrong-worker"),
      false,
    );
    assert.equal(
      await completeJob(connection.database, fixture.job.id, owner),
      true,
    );

    const [order] = await connection.database
      .select()
      .from(orders)
      .where(eq(orders.id, fixture.order.id));
    assert.equal(order?.status, "ready_to_ship");
  } finally {
    await cleanupOrder(fixture.order.id);
  }
});

void test("retries failures and marks the final attempt failed", async () => {
  const fixture = await createTestJob();
  try {
    const first = await claimNextJob(
      connection.database,
      "retry-worker",
      30_000,
    );
    assert.ok(first);
    assert.equal(
      await recordJobFailure(
        connection.database,
        first,
        "retry-worker",
        new Error("temporary"),
        2,
        0,
      ),
      "retry_scheduled",
    );

    const second = await claimNextJob(
      connection.database,
      "retry-worker",
      30_000,
    );
    assert.ok(second);
    assert.equal(second.attempts, 2);
    assert.equal(
      await recordJobFailure(
        connection.database,
        second,
        "retry-worker",
        new Error("still failing"),
        2,
        0,
      ),
      "failed",
    );

    const [job] = await connection.database
      .select()
      .from(jobs)
      .where(eq(jobs.id, fixture.job.id));
    const [order] = await connection.database
      .select()
      .from(orders)
      .where(eq(orders.id, fixture.order.id));
    assert.equal(job?.status, "failed");
    assert.equal(job?.attempts, 2);
    assert.equal(order?.status, "failed");
  } finally {
    await cleanupOrder(fixture.order.id);
  }
});

void test("a new worker recovers an expired processing lease", async () => {
  const oldLock = new Date(Date.now() - 60_000);
  const fixture = await createTestJob({
    status: "processing",
    attempts: 1,
    lockedAt: oldLock,
    lockedBy: "dead-worker",
  });
  try {
    const recovered = await claimNextJob(
      connection.database,
      "replacement-worker",
      30_000,
    );
    assert.equal(recovered?.id, fixture.job.id);
    assert.equal(recovered?.lockedBy, "replacement-worker");
    assert.equal(recovered?.attempts, 2);

    assert.equal(
      await completeJob(connection.database, fixture.job.id, "dead-worker"),
      false,
    );
    assert.equal(
      await completeJob(
        connection.database,
        fixture.job.id,
        "replacement-worker",
      ),
      true,
    );
  } finally {
    await cleanupOrder(fixture.order.id);
  }
});

void test("claims an SQS delivery once and recognizes a completed duplicate", async () => {
  const fixture = await createTestJob();
  try {
    const firstClaim = await claimJobForSqsDelivery(
      connection.database,
      fixture.job.id,
      "sqs-worker",
      30_000,
    );
    assert.ok(firstClaim.kind === "claimed");
    assert.equal(firstClaim.job.id, fixture.job.id);
    assert.equal(
      await completeJob(connection.database, fixture.job.id, "sqs-worker"),
      true,
    );

    const duplicate = await claimJobForSqsDelivery(
      connection.database,
      fixture.job.id,
      "sqs-worker",
      30_000,
    );
    assert.equal(duplicate.kind, "already_completed");
  } finally {
    await cleanupOrder(fixture.order.id);
  }
});

void test("does not claim an SQS delivery while another worker holds a fresh lease", async () => {
  const fixture = await createTestJob({
    status: "processing",
    attempts: 1,
    lockedAt: new Date(),
    lockedBy: "other-worker",
  });
  try {
    const result = await claimJobForSqsDelivery(
      connection.database,
      fixture.job.id,
      "sqs-worker",
      30_000,
    );
    assert.equal(result.kind, "not_claimable");
  } finally {
    await cleanupOrder(fixture.order.id);
  }
});
