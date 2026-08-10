import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";

type SecretValueLoader = (secretId: string, region: string) => Promise<string>;

function requiredString(
  value: unknown,
  field: string,
): asserts value is string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Database secret is missing required field: ${field}`);
  }
}

async function loadAwsSecret(secretId: string, region: string) {
  const client = new SecretsManagerClient({ region });
  const response = await client.send(
    new GetSecretValueCommand({ SecretId: secretId }),
  );

  if (!response.SecretString) {
    throw new Error("Database secret did not contain a SecretString");
  }

  return response.SecretString;
}

export async function resolveDatabaseEnvironment(
  environment: NodeJS.ProcessEnv = process.env,
  loadSecret: SecretValueLoader = loadAwsSecret,
): Promise<NodeJS.ProcessEnv> {
  if (environment.DATABASE_URL) return environment;

  const secretId = environment.DB_SECRET_ID;
  const databaseName = environment.DB_NAME;
  const region = environment.AWS_REGION;

  requiredString(secretId, "DB_SECRET_ID environment setting");
  requiredString(region, "AWS_REGION environment setting");
  requiredString(databaseName, "DB_NAME environment setting");
  if (!/^[A-Za-z][A-Za-z0-9_]{0,62}$/.test(databaseName)) {
    throw new Error("DB_NAME must be a valid PostgreSQL database name");
  }

  const secretText = await loadSecret(secretId, region);
  let secret: unknown;
  try {
    secret = JSON.parse(secretText);
  } catch {
    throw new Error("Database secret was not valid JSON");
  }

  if (typeof secret !== "object" || secret === null) {
    throw new Error("Database secret must be a JSON object");
  }

  const fields = secret as Record<string, unknown>;
  requiredString(fields.username, "username");
  requiredString(fields.password, "password");
  requiredString(fields.host, "host");
  if (fields.engine !== "postgres") {
    throw new Error("Database secret engine must be postgres");
  }

  const port = Number(fields.port);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("Database secret port must be valid");
  }

  const databaseUrl = new URL("postgresql://localhost");
  databaseUrl.username = fields.username;
  databaseUrl.password = fields.password;
  databaseUrl.hostname = fields.host;
  databaseUrl.port = String(port);
  databaseUrl.pathname = `/${databaseName}`;

  return { ...environment, DATABASE_URL: databaseUrl.toString() };
}
