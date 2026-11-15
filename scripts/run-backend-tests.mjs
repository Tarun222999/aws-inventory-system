import { readdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const mode = process.argv[2];

if (!["unit", "integration"].includes(mode)) {
  throw new Error("Usage: node scripts/run-backend-tests.mjs unit|integration");
}

async function discover(directory) {
  const files = [];

  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const location = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await discover(location)));
    } else if (entry.name.endsWith(".test.ts")) {
      files.push(location);
    }
  }

  return files;
}

const directories = [
  "apps/api/src",
  "apps/worker/src",
  "packages/config/src",
  "packages/events/src",
];

const discovered = (
  await Promise.all(
    directories.map((directory) => discover(path.join(root, directory))),
  )
).flat();

const selected = discovered
  .filter((file) => {
    const needsDatabase = file.endsWith(".repository.test.ts");
    return mode === "integration" ? needsDatabase : !needsDatabase;
  })
  .sort();

if (selected.length === 0) {
  throw new Error(`No ${mode} test files found`);
}

console.log(`Running ${selected.length} ${mode} test files`);

const result = spawnSync(
  process.execPath,
  ["--import", "tsx", "--test", "--test-concurrency=1", ...selected],
  { cwd: root, stdio: "inherit" },
);

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
