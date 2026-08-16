import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";

import {
  loadApiConfig,
  resolveDatabaseSecretSnapshot,
} from "@order-platform/config";
import { createDatabase } from "@order-platform/database";

type SafeError = {
  code?: string;
  name: string;
};

function safeError(error: unknown): SafeError {
  if (typeof error !== "object" || error === null) return { name: "unknown" };

  const candidate = error as { code?: unknown; name?: unknown };
  const identity: SafeError = {
    name: typeof candidate.name === "string" ? candidate.name : "unknown",
  };
  if (typeof candidate.code === "string") identity.code = candidate.code;
  return identity;
}

function boundedInteger(
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
) {
  const parsed = value === undefined ? fallback : Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(
      `Rotation timing must be an integer from ${minimum} to ${maximum}`,
    );
  }
  return parsed;
}

async function verifyTlsConnection(
  databaseUrl: string,
  caPath: string,
  applicationName: string,
) {
  const connection = createDatabase(databaseUrl, {
    applicationName,
    maxConnections: 1,
    onPoolError: () => undefined,
    sslCertificateAuthorityPath: caPath,
  });

  try {
    const result = await connection.pool.query<{
      ssl: boolean;
      version: string;
    }>("select ssl, version from pg_stat_ssl where pid = pg_backend_pid()");
    assert.equal(result.rows[0]?.ssl, true);
    return { encrypted: true, version: result.rows[0]?.version };
  } finally {
    await connection.close();
  }
}

let currentStage = "startup";

async function main() {
  const pollSeconds = boundedInteger(
    process.env.ROTATION_POLL_SECONDS,
    5,
    2,
    30,
  );
  const waitSeconds = boundedInteger(
    process.env.ROTATION_WAIT_SECONDS,
    600,
    60,
    900,
  );

  currentStage = "capture-initial-secret";
  const initial = await resolveDatabaseSecretSnapshot();
  const initialConfig = loadApiConfig(initial.environment);
  assert.ok(initialConfig.DATABASE_SSL_CA_PATH);

  currentStage = "verify-initial-connection";
  const initialTls = await verifyTlsConnection(
    initialConfig.DATABASE_URL,
    initialConfig.DATABASE_SSL_CA_PATH,
    "order-platform-phase5-rotation-initial",
  );
  console.log("phase5.rotation.initial", {
    connected: true,
    tls: initialTls,
  });
  console.log("phase5.rotation.awaiting", {
    pollSeconds,
    waitSeconds,
  });

  currentStage = "wait-for-secret-rotation";
  const deadline = Date.now() + waitSeconds * 1_000;
  let rotated:
    | Awaited<ReturnType<typeof resolveDatabaseSecretSnapshot>>
    | undefined;
  while (Date.now() < deadline) {
    await delay(pollSeconds * 1_000);
    const candidate = await resolveDatabaseSecretSnapshot();
    if (candidate.versionId !== initial.versionId) {
      rotated = candidate;
      break;
    }
  }
  assert.ok(rotated, "Timed out waiting for the database secret to rotate");
  console.log("phase5.rotation.detected", { versionChanged: true });

  currentStage = "verify-stale-credential-denial";
  let staleCredentialDenied = false;
  let staleError: SafeError | undefined;
  try {
    await verifyTlsConnection(
      initialConfig.DATABASE_URL,
      initialConfig.DATABASE_SSL_CA_PATH,
      "order-platform-phase5-rotation-stale",
    );
  } catch (error) {
    staleCredentialDenied = true;
    staleError = safeError(error);
  }
  assert.equal(staleCredentialDenied, true);
  console.log("phase5.rotation.stale", {
    denied: staleCredentialDenied,
    error: staleError,
  });

  currentStage = "verify-rotated-credential-recovery";
  const rotatedConfig = loadApiConfig(rotated.environment);
  assert.ok(rotatedConfig.DATABASE_SSL_CA_PATH);
  const recoveredTls = await verifyTlsConnection(
    rotatedConfig.DATABASE_URL,
    rotatedConfig.DATABASE_SSL_CA_PATH,
    "order-platform-phase5-rotation-recovered",
  );
  console.log("phase5.rotation.recovered", {
    connected: true,
    tls: recoveredTls,
  });

  currentStage = "complete";
  console.log("phase5.rotation", {
    completed: true,
    credentialsLogged: false,
    recoveryRequiredTaskDefinitionChange: false,
  });
}

void main().catch((error: unknown) => {
  console.error("phase5.rotation", {
    completed: false,
    error: safeError(error),
    stage: currentStage,
  });
  process.exitCode = 1;
});
