// Offline production configuration check: reads environment variables only, no network or database.
//   node --env-file=<production env file> --import tsx src/lib/config/check.ts
import { productionConfigProblems } from "./production.ts";

const problems = productionConfigProblems(process.env);
if (problems.length) {
  console.error(`production_config_invalid\n${problems.join("\n")}`);
  process.exitCode = 1;
} else console.log("production_config_ok");
