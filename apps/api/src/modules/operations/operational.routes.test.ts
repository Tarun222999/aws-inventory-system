import assert from "node:assert/strict";
import { createServer } from "node:http";
import { test } from "node:test";

import { handleOperationalRoute } from "./operational.routes.js";

type HealthMode = "healthy" | "unhealthy";

async function withServer(
  healthMode: HealthMode,
  run: (baseUrl: string) => Promise<void>,
) {
  const server = createServer((request, response) => {
    void handleOperationalRoute(request, response, {
      appVersion: "phase4-test-v1",
      healthMode,
      instanceId: "test-task",
      maximumSlowRequestMs: 100,
    }).then((handled) => {
      if (!handled) {
        response.writeHead(404).end();
      }
    });
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert(address && typeof address !== "string");

  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
}

void test("healthy and unhealthy images return distinct load-balancer health", async () => {
  await withServer("healthy", async (baseUrl) => {
    const response = await fetch(`${baseUrl}/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      status: "ok",
      version: "phase4-test-v1",
    });
  });

  await withServer("unhealthy", async (baseUrl) => {
    const response = await fetch(`${baseUrl}/health`);
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), {
      status: "unhealthy",
      version: "phase4-test-v1",
    });
  });
});

void test("version and bounded slow-request endpoints identify the task", async () => {
  await withServer("healthy", async (baseUrl) => {
    const versionResponse = await fetch(`${baseUrl}/version`);
    assert.deepEqual(await versionResponse.json(), {
      status: "ok",
      version: "phase4-test-v1",
      instance: "test-task",
    });

    const slowResponse = await fetch(`${baseUrl}/phase4/slow?delayMs=10`);
    assert.equal(slowResponse.status, 200);
    assert.deepEqual(await slowResponse.json(), {
      status: "completed",
      version: "phase4-test-v1",
      instance: "test-task",
      delayMs: 10,
    });

    const invalidResponse = await fetch(`${baseUrl}/phase4/slow?delayMs=101`);
    assert.equal(invalidResponse.status, 400);
  });
});
