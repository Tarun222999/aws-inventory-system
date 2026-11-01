import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const log = (event, fields = {}) => console.log(JSON.stringify({ component: "phase9-api-smoke", event, ...fields }));
const api = spawn(process.execPath, ["--import", "tsx", "apps/api/src/main.ts"], { stdio: "inherit" });
let apiExit;
let interrupted = false;
const exited = new Promise((resolve) => {
  api.once("exit", (code, signal) => { apiExit = { code, signal }; resolve(); });
  api.once("error", () => { apiExit = { error: true }; resolve(); });
});
process.once("SIGTERM", () => { interrupted = true; api.kill("SIGTERM"); });
const deadline = setTimeout(() => {
  log("smoke.timeout");
  api.kill("SIGKILL");
  process.exit(1);
}, 180000);

async function request(path, method = "GET", body) {
  if (interrupted || apiExit) throw new Error("API stopped or test interrupted");
  const response = await fetch("http://127.0.0.1:3000" + path, {
    method,
    headers: { "content-type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(5000),
  });
  const data = await response.json();
  return { status: response.status, data };
}

try {
  let ready = false;
  for (let attempt = 0; attempt < 45; attempt++) {
    if (interrupted || apiExit) throw new Error("API exited before readiness");
    try { ready = (await request("/ready")).status === 200; } catch {}
    if (ready) break;
    await delay(1000);
  }
  assert.ok(ready, "API readiness must succeed");
  assert.equal((await request("/health")).status, 200);
  log("smoke.api_ready");

  const product = await request("/products", "POST", {
    sku: "TF9-SMOKE-" + Date.now(),
    name: "Terraform integration practice product",
    pricePaise: 12500,
    initialQuantity: 2,
  });
  assert.equal(product.status, 201, "Product creation must return 201");
  assert.ok(product.data.data.id);
  const order = await request("/orders", "POST", {
    items: [{ productId: product.data.data.id, quantity: 1 }],
  });
  assert.equal(order.status, 201, "Order creation must return 201");
  const orderId = order.data.data.id;
  assert.ok(orderId);
  assert.equal(order.data.data.totalPaise, 12500);
  log("smoke.order_created", { productId: product.data.data.id, orderId });

  let completed;
  for (let attempt = 0; attempt < 75; attempt++) {
    const observed = await request("/orders/" + orderId);
    assert.equal(observed.status, 200);
    if (observed.data.data.status === "ready_to_ship") { completed = observed.data.data; break; }
    await delay(1000);
  }
  assert.ok(completed, "Worker must advance the order to ready_to_ship");
  assert.equal(completed.totalPaise, 12500);
  log("smoke.complete", { verified: true, orderId, status: completed.status, totalPaise: completed.totalPaise });
} catch (error) {
  log("smoke.failed", { errorName: error.name, message: error.message });
  process.exitCode = 1;
} finally {
  clearTimeout(deadline);
  if (!apiExit) api.kill("SIGTERM");
  await Promise.race([exited, delay(12000)]);
  if (!apiExit) { api.kill("SIGKILL"); await exited; }
}

