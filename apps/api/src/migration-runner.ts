import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { createDatabase, type PoolClient } from "@order-platform/database";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

const migrationLockName = "aws-order-platform-schema-migrations";

type MigrationJournalEntry = {
  idx: number;
  tag: string;
  when: number;
};

export type MigrationTarget = MigrationJournalEntry;

type MigrationLog = (
  level: "info" | "error",
  event: string,
  fields?: Record<string, unknown>,
) => void;

export function parseMigrationTarget(journalText: string): MigrationTarget {
  let journal: unknown;
  try {
    journal = JSON.parse(journalText);
  } catch {
    throw new Error("Migration journal is not valid JSON");
  }

  if (
    typeof journal !== "object" ||
    journal === null ||
    !("entries" in journal)
  ) {
    throw new Error("Migration journal is missing entries");
  }
  const entries = journal.entries;
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error("Migration journal contains no migrations");
  }

  const latest = entries.at(-1) as Partial<MigrationJournalEntry> | undefined;
  if (
    !latest ||
    !Number.isInteger(latest.idx) ||
    typeof latest.tag !== "string" ||
    latest.tag.length === 0 ||
    !Number.isSafeInteger(latest.when) ||
    (latest.when ?? 0) <= 0
  ) {
    throw new Error("Migration journal has an invalid latest entry");
  }

  return {
    idx: latest.idx,
    tag: latest.tag,
    when: latest.when,
  } as MigrationTarget;
}

export async function loadMigrationTarget(migrationsFolder: string) {
  const journalText = await readFile(
    join(migrationsFolder, "meta", "_journal.json"),
    "utf8",
  );
  return parseMigrationTarget(journalText);
}

export async function runDatabaseMigrations(options: {
  databaseUrl: string;
  migrationsFolder: string;
  sslCertificateAuthorityPath: string;
  log: MigrationLog;
}) {
  const target = await loadMigrationTarget(options.migrationsFolder);
  options.log("info", "migration.start", {
    targetIndex: target.idx,
    targetTag: target.tag,
  });

  const connection = createDatabase(options.databaseUrl, {
    applicationName: "order-platform-migration-runner",
    maxConnections: 1,
    onPoolError: (error) =>
      options.log("error", "migration.pool_error", {
        errorName: error.name,
      }),
    queryTimeoutMillis: 30_000,
    sslCertificateAuthorityPath: options.sslCertificateAuthorityPath,
  });
  let client: PoolClient | undefined;
  let lockAcquired = false;

  try {
    client = await connection.pool.connect();
    const tls = await client.query<{ ssl: boolean; version: string }>(
      "select ssl, version from pg_stat_ssl where pid = pg_backend_pid()",
    );
    if (tls.rows[0]?.ssl !== true) {
      throw new Error("Migration runner database connection is not encrypted");
    }
    options.log("info", "migration.tls_verified", {
      encrypted: true,
      version: tls.rows[0].version,
    });

    await client.query("set statement_timeout = '30s'");
    await client.query("set lock_timeout = '5s'");
    await client.query("set idle_in_transaction_session_timeout = '30s'");

    const lock = await client.query<{ acquired: boolean }>(
      "select pg_try_advisory_lock(hashtext($1)) as acquired",
      [migrationLockName],
    );
    lockAcquired = lock.rows[0]?.acquired === true;
    if (!lockAcquired) {
      throw new Error(
        "Another database migration runner already holds the lock",
      );
    }

    const migrationDatabase = drizzle({ client });
    await migrate(migrationDatabase, {
      migrationsFolder: options.migrationsFolder,
    });

    const applied = await client.query<{ createdAt: string }>(
      'select created_at::text as "createdAt" from drizzle.__drizzle_migrations order by created_at desc limit 1',
    );
    const appliedThrough = Number(applied.rows[0]?.createdAt);
    if (appliedThrough !== target.when) {
      throw new Error(
        "Database migration journal did not reach the expected target",
      );
    }

    options.log("info", "migration.complete", {
      appliedThrough: target.tag,
      verified: true,
    });
    return target;
  } finally {
    if (client && lockAcquired) {
      try {
        await client.query("select pg_advisory_unlock(hashtext($1))", [
          migrationLockName,
        ]);
      } catch (error) {
        options.log("error", "migration.unlock_failed", {
          errorName: error instanceof Error ? error.name : "UnknownError",
        });
      }
    }
    client?.release(true);
    await connection.close();
  }
}
