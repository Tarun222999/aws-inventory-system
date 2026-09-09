import assert from "node:assert/strict";
import test from "node:test";

import {
  loadApiConfig,
  loadOutboxPublisherConfig,
  loadSqsWorkerConfig,
  loadWorkerConfig,
  resolveDatabaseEnvironment,
  resolveDatabaseSecretSnapshot,
} from "./index.js";

const databaseUrl = "postgresql://user:password@localhost:5432/order_platform";

void test("uses a conservative database pool default", () => {
  assert.equal(
    loadApiConfig({ DATABASE_URL: databaseUrl }).DATABASE_POOL_MAX,
    5,
  );
  assert.equal(
    loadWorkerConfig({ DATABASE_URL: databaseUrl }).DATABASE_POOL_MAX,
    5,
  );
});

void test("accepts a bounded database pool override", () => {
  assert.equal(
    loadApiConfig({
      DATABASE_URL: databaseUrl,
      DATABASE_POOL_MAX: "8",
    }).DATABASE_POOL_MAX,
    8,
  );
});

void test("rejects unsafe database pool limits", () => {
  for (const value of ["0", "21", "1.5", "not-a-number"]) {
    assert.throws(() =>
      loadApiConfig({
        DATABASE_URL: databaseUrl,
        DATABASE_POOL_MAX: value,
      }),
    );
  }
});

void test("requires SQS and EventBridge destinations for the outbox publisher", () => {
  const config = loadOutboxPublisherConfig({
    DATABASE_URL: databaseUrl,
    ORDER_PROCESSING_QUEUE_URL:
      "https://sqs.ap-south-1.amazonaws.com/123456789012/order-processing",
    ORDER_EVENT_BUS_NAME: "order-platform-phase7",
  });
  assert.equal(config.AWS_REGION, "ap-south-1");
  assert.equal(config.OUTBOX_POLL_INTERVAL_MS, 1_000);
  assert.equal(config.OUTBOX_LEASE_TIMEOUT_MS, 30_000);
  assert.equal(config.OUTBOX_RETRY_DELAY_MS, 1_000);
  assert.equal(config.ORDER_EVENT_BUS_NAME, "order-platform-phase7");

  assert.throws(() => loadOutboxPublisherConfig({ DATABASE_URL: databaseUrl }));

  assert.throws(() =>
    loadOutboxPublisherConfig({
      DATABASE_URL: databaseUrl,
      ORDER_EVENT_BUS_NAME: "order-platform-phase7",
    }),
  );

  assert.throws(() =>
    loadOutboxPublisherConfig({
      DATABASE_URL: databaseUrl,
      ORDER_PROCESSING_QUEUE_URL:
        "https://sqs.ap-south-1.amazonaws.com/123456789012/order-processing",
    }),
  );
});

void test("bounds SQS long polling for the SQS worker", () => {
  const environment = {
    DATABASE_URL: databaseUrl,
    ORDER_PROCESSING_QUEUE_URL:
      "https://sqs.ap-south-1.amazonaws.com/123456789012/order-processing",
  };

  assert.equal(
    loadSqsWorkerConfig(environment).SQS_RECEIVE_WAIT_TIME_SECONDS,
    20,
  );
  for (const value of ["0", "21"]) {
    assert.throws(() =>
      loadSqsWorkerConfig({
        ...environment,
        SQS_RECEIVE_WAIT_TIME_SECONDS: value,
      }),
    );
  }
});

void test("keeps an explicit local database URL without loading a secret", async () => {
  let calls = 0;
  const environment = { DATABASE_URL: databaseUrl };
  const resolved = await resolveDatabaseEnvironment(environment, () => {
    calls += 1;
    return Promise.resolve("unused");
  });

  assert.equal(resolved, environment);
  assert.equal(calls, 0);
});

void test("builds an encoded PostgreSQL URL from an RDS-managed secret", async () => {
  const resolved = await resolveDatabaseEnvironment(
    {
      AWS_REGION: "ap-south-1",
      DB_HOST: "private.example.rds.amazonaws.com",
      DB_NAME: "order_platform",
      DB_PORT: "5432",
      DB_SECRET_ID: "secret-reference",
    },
    (secretId, region) => {
      assert.equal(secretId, "secret-reference");
      assert.equal(region, "ap-south-1");
      return Promise.resolve(
        JSON.stringify({
          password: "special:/?#[]@ password",
          username: "order_admin",
        }),
      );
    },
  );

  const url = new URL(resolved.DATABASE_URL ?? "");
  assert.equal(url.protocol, "postgresql:");
  assert.equal(url.username, "order_admin");
  assert.equal(url.password, "special%3A%2F%3F%23%5B%5D%40%20password");
  assert.equal(url.hostname, "private.example.rds.amazonaws.com");
  assert.equal(url.port, "5432");
  assert.equal(url.pathname, "/order_platform");
});

void test("rejects a malformed or non-PostgreSQL database secret", async () => {
  const environment = {
    AWS_REGION: "ap-south-1",
    DB_HOST: "private.example.rds.amazonaws.com",
    DB_NAME: "order_platform",
    DB_PORT: "5432",
    DB_SECRET_ID: "secret-reference",
  };

  await assert.rejects(
    resolveDatabaseEnvironment(environment, () => Promise.resolve("not-json")),
    /not valid JSON/,
  );
  await assert.rejects(
    resolveDatabaseEnvironment(environment, () =>
      Promise.resolve(
        JSON.stringify({
          engine: "mysql",
          host: "private.example",
          password: "password",
          port: 5432,
          username: "user",
        }),
      ),
    ),
    /engine must be postgres/,
  );
});

void test("resolves a versioned RDS secret without exposing its fields", async () => {
  const snapshot = await resolveDatabaseSecretSnapshot(
    {
      AWS_REGION: "ap-south-1",
      DB_HOST: "private.example.rds.amazonaws.com",
      DB_NAME: "order_platform",
      DB_PORT: "5432",
      DB_SECRET_ID: "secret-reference",
    },
    (secretId, region) => {
      assert.equal(secretId, "secret-reference");
      assert.equal(region, "ap-south-1");
      return Promise.resolve({
        secretText: JSON.stringify({
          password: "rotated-password",
          username: "order_admin",
        }),
        versionId: "version-two",
      });
    },
  );

  assert.equal(snapshot.versionId, "version-two");
  const url = new URL(snapshot.environment.DATABASE_URL ?? "");
  assert.equal(url.hostname, "private.example.rds.amazonaws.com");
  assert.equal(url.password, "rotated-password");
});
