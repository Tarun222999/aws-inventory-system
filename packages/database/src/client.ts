import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema.js";

type DatabaseOptions = {
  onPoolError: (error: Error) => void;
};

export function createDatabase(databaseUrl: string, options: DatabaseOptions) {
  const pool = new Pool({
    connectionString: databaseUrl,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    query_timeout: 2_000,
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
