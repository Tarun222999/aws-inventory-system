import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

import {
  loadApiConfig,
  resolveDatabaseEnvironment,
} from "@order-platform/config";
import {
  createDatabase,
  inventory,
  orders,
  products,
} from "@order-platform/database";
import { eq, inArray } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";

import {
  createOrder,
  InsufficientStockError,
} from "./modules/orders/order.repository.js";
import { createProduct } from "./modules/products/product.repository.js";

type ExplainPlan = {
  Plan?: {
    "Actual Rows"?: number;
    "Index Name"?: string;
    "Node Type"?: string;
  };
  "Execution Time"?: number;
  "Planning Time"?: number;
};

function safeError(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return { name: "UnknownError" };
  }

  return {
    code:
      "code" in error && typeof error.code === "string"
        ? error.code
        : undefined,
    name:
      "name" in error && typeof error.name === "string"
        ? error.name
        : "UnknownError",
  };
}

async function main() {
  const config = loadApiConfig(await resolveDatabaseEnvironment());
  if (!config.DATABASE_SSL_CA_PATH) {
    throw new Error("DATABASE_SSL_CA_PATH is required for the Phase 5 lab");
  }

  const connection = createDatabase(config.DATABASE_URL, {
    applicationName: "order-platform-phase5-lab",
    maxConnections: config.DATABASE_POOL_MAX,
    onPoolError: (error) =>
      console.error("Phase 5 lab pool error", safeError(error)),
    sslCertificateAuthorityPath: config.DATABASE_SSL_CA_PATH,
  });

  try {
    await migrate(connection.database, {
      migrationsFolder: fileURLToPath(
        new URL("../../../packages/database/migrations", import.meta.url),
      ),
    });
    console.log("phase5.migrations", { applied: true });

    const tls = await connection.pool.query<{
      cipher: string;
      ssl: boolean;
      version: string;
    }>(
      "select ssl, version, cipher from pg_stat_ssl where pid = pg_backend_pid()",
    );
    assert.equal(tls.rows[0]?.ssl, true);
    console.log("phase5.tls", {
      cipher: tls.rows[0]?.cipher,
      encrypted: tls.rows[0]?.ssl,
      version: tls.rows[0]?.version,
    });

    const nonTls = createDatabase(config.DATABASE_URL, {
      applicationName: "order-platform-phase5-non-tls-test",
      maxConnections: 1,
      onPoolError: () => undefined,
    });
    let nonTlsDenied = false;
    let nonTlsError: ReturnType<typeof safeError> | undefined;
    try {
      await nonTls.pool.query("select 1");
    } catch (error) {
      nonTlsDenied = true;
      nonTlsError = safeError(error);
    } finally {
      await nonTls.close();
    }
    assert.equal(nonTlsDenied, true);
    console.log("phase5.non_tls", {
      denied: nonTlsDenied,
      error: nonTlsError,
    });

    const simulatedPools: Array<ReturnType<typeof createDatabase>> = [];
    const heldClients: Array<{ release: () => void }> = [];
    try {
      for (const simulatedTaskCount of [1, 2, 4]) {
        while (simulatedPools.length < simulatedTaskCount) {
          const number = simulatedPools.length + 1;
          const pool = createDatabase(config.DATABASE_URL, {
            applicationName: `order-platform-phase5-sim:${number}`,
            maxConnections: config.DATABASE_POOL_MAX,
            onPoolError: () => undefined,
            sslCertificateAuthorityPath: config.DATABASE_SSL_CA_PATH,
          });
          simulatedPools.push(pool);
          heldClients.push(await pool.pool.connect());
        }

        const observed = await connection.pool.query<{ count: number }>(
          "select count(*)::int as count from pg_stat_activity where datname = current_database() and application_name like 'order-platform-phase5-sim:%'",
        );
        console.log("phase5.connection_scaling", {
          observedConnections: observed.rows[0]?.count,
          poolMaximumPerTask: config.DATABASE_POOL_MAX,
          simulatedTaskCount,
          theoreticalApplicationCeiling:
            simulatedTaskCount * config.DATABASE_POOL_MAX,
        });
      }
    } finally {
      for (const client of heldClients) client.release();
      await Promise.all(simulatedPools.map((pool) => pool.close()));
    }

    const sku = `PHASE5-${Date.now()}`;
    const product = await createProduct(connection.database, {
      initialQuantity: 1,
      name: "Phase 5 final item",
      pricePaise: 100,
      sku,
    });
    const orderResults = await Promise.allSettled([
      createOrder(connection.database, {
        items: [{ productId: product.id, quantity: 1 }],
      }),
      createOrder(connection.database, {
        items: [{ productId: product.id, quantity: 1 }],
      }),
    ]);

    const successfulOrderIds = orderResults.flatMap((result) =>
      result.status === "fulfilled" ? [result.value.id] : [],
    );
    const rejectedOrders = orderResults.filter(
      (result) =>
        result.status === "rejected" &&
        result.reason instanceof InsufficientStockError,
    );
    const [stock] = await connection.database
      .select({ availableQuantity: inventory.availableQuantity })
      .from(inventory)
      .where(eq(inventory.productId, product.id));

    try {
      assert.equal(successfulOrderIds.length, 1);
      assert.equal(rejectedOrders.length, 1);
      assert.equal(stock?.availableQuantity, 0);
      console.log("phase5.concurrent_final_item", {
        finalQuantity: stock?.availableQuantity,
        insufficientStockFailures: rejectedOrders.length,
        successfulOrders: successfulOrderIds.length,
      });

      const explanation = await connection.pool.query<{
        "QUERY PLAN": ExplainPlan[];
      }>(
        "explain (analyze, buffers, format json) select * from products where sku = $1",
        [sku],
      );
      const plan = explanation.rows[0]?.["QUERY PLAN"]?.[0];
      console.log("phase5.query_plan", {
        actualRows: plan?.Plan?.["Actual Rows"],
        executionTimeMs: plan?.["Execution Time"],
        indexName: plan?.Plan?.["Index Name"] ?? null,
        nodeType: plan?.Plan?.["Node Type"],
        planningTimeMs: plan?.["Planning Time"],
      });
    } finally {
      if (successfulOrderIds.length > 0) {
        await connection.database
          .delete(orders)
          .where(inArray(orders.id, successfulOrderIds));
      }
      await connection.database
        .delete(products)
        .where(eq(products.id, product.id));
    }

    console.log("phase5.lab", { completed: true, testRowsDeleted: true });
  } finally {
    await connection.close();
  }
}

void main().catch((error: unknown) => {
  console.error("phase5.lab", { completed: false, error: safeError(error) });
  process.exitCode = 1;
});
