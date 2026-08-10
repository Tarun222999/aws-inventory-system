import { readFileSync } from "node:fs";

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema.js";

type DatabaseOptions = {
  applicationName: string;
  maxConnections: number;
  onPoolError: (error: Error) => void;
  sslCertificateAuthorityPath?: string;
};

export function createDatabase(databaseUrl: string, options: DatabaseOptions) {
  const pool = new Pool({
    application_name: options.applicationName,
    connectionString: databaseUrl,
    max: options.maxConnections,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    query_timeout: 2_000,
    ...(options.sslCertificateAuthorityPath
      ? {
          ssl: {
            ca: readFileSync(options.sslCertificateAuthorityPath, "utf8"),
            rejectUnauthorized: true,
          },
        }
      : {}),
  });

  pool.on("error", options.onPoolError);

  const database = drizzle({ client: pool, schema });

  return {
    database,
    pool,
    close: () => pool.end(),
  };
}

export type Database = ReturnType<typeof createDatabase>["database"];

export async function checkDatabase(pool: Pool): Promise<void> {
  await pool.query("select 1");
}
