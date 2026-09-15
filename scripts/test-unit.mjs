import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";

// Live Redis integration is deliberately opt-in via npm run test:auth:redis.
const files = readdirSync("tests")
  .filter(
    (file) => file.endsWith(".test.ts") && !file.endsWith(".redis.test.ts"),
  )
  .sort()
  .map((file) => `tests/${file}`);
// Next's navigation module needs the normal React runtime outside Next's bundler.
const navigationTests = files.filter((file) => file === "tests/seo.test.ts");
const result = spawnSync(
  process.execPath,
  [
    "--conditions=react-server",
    "--import",
    "tsx",
    "--test",
    ...files.filter((file) => !navigationTests.includes(file)),
  ],
  { stdio: "inherit" },
);
if (result.status !== 0) process.exit(result.status ?? 1);
const navigationResult = spawnSync(
  process.execPath,
  ["--import", "tsx", "--test", ...navigationTests],
  { stdio: "inherit" },
);
process.exit(navigationResult.status ?? 1);
