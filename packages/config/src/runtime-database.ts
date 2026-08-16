import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";

type SecretValueLoader = (secretId: string, region: string) => Promise<string>;
type VersionedSecretValueLoader = (
  secretId: string,
  region: string,
) => Promise<{ secretText: string; versionId: string }>;

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

async function loadVersionedAwsSecret(secretId: string, region: string) {
  const client = new SecretsManagerClient({ region });
  const response = await client.send(
    new GetSecretValueCommand({
      SecretId: secretId,
      VersionStage: "AWSCURRENT",
    }),
  );

  if (!response.SecretString) {
    throw new Error("Database secret did not contain a SecretString");
  }
  if (!response.VersionId) {
    throw new Error("Database secret did not contain a VersionId");
  }

  return { secretText: response.SecretString, versionId: response.VersionId };
}

function databaseEnvironmentFromSecret(
  environment: NodeJS.ProcessEnv,
  secretText: string,
): NodeJS.ProcessEnv {
  const databaseName = environment.DB_NAME;
  const configuredHost = environment.DB_HOST;
  const configuredPort = environment.DB_PORT;

  requiredString(databaseName, "DB_NAME environment setting");
  if (!/^[A-Za-z][A-Za-z0-9_]{0,62}$/.test(databaseName)) {
    throw new Error("DB_NAME must be a valid PostgreSQL database name");
  }

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
  const host = configuredHost ?? fields.host;
  const rawPort = configuredPort ?? fields.port;
  requiredString(host, "DB_HOST environment setting or host");
  if (fields.engine !== undefined && fields.engine !== "postgres") {
    throw new Error("Database secret engine must be postgres");
  }

  const port = Number(rawPort);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("DB_PORT environment setting or secret port must be valid");
  }

  const databaseUrl = new URL("postgresql://localhost");
  databaseUrl.username = fields.username;
  databaseUrl.password = fields.password;
  databaseUrl.hostname = host;
  databaseUrl.port = String(port);
  databaseUrl.pathname = `/${databaseName}`;

  return { ...environment, DATABASE_URL: databaseUrl.toString() };
}

export async function resolveDatabaseEnvironment(
  environment: NodeJS.ProcessEnv = process.env,
  loadSecret: SecretValueLoader = loadAwsSecret,
): Promise<NodeJS.ProcessEnv> {
  if (environment.DATABASE_URL) return environment;

  const secretId = environment.DB_SECRET_ID;
  const region = environment.AWS_REGION;

  requiredString(secretId, "DB_SECRET_ID environment setting");
  requiredString(region, "AWS_REGION environment setting");
  const secretText = await loadSecret(secretId, region);
  return databaseEnvironmentFromSecret(environment, secretText);
}

export async function resolveDatabaseSecretSnapshot(
  environment: NodeJS.ProcessEnv = process.env,
  loadSecret: VersionedSecretValueLoader = loadVersionedAwsSecret,
) {
  const secretId = environment.DB_SECRET_ID;
  const region = environment.AWS_REGION;

  requiredString(secretId, "DB_SECRET_ID environment setting");
  requiredString(region, "AWS_REGION environment setting");

  const snapshot = await loadSecret(secretId, region);
  requiredString(snapshot.versionId, "secret VersionId");

  return {
    environment: databaseEnvironmentFromSecret(
      environment,
      snapshot.secretText,
    ),
    versionId: snapshot.versionId,
  };
}
