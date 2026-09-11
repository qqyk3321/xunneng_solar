import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";

// Live Redis integration is deliberately opt-in via npm run test:auth:redis.
const files = readdirSync("tests")
  .filter(
    (file) => file.endsWith(".test.ts") && !file.endsWith(".redis.test.ts"),
  )
  .sort()
  .map((file) => `tests/${file}`);
const result = spawnSync(
  process.execPath,
  ["--conditions=react-server", "--import", "tsx", "--test", ...files],
  { stdio: "inherit" },
);
process.exit(result.status ?? 1);
