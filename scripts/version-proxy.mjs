import { fileURLToPath } from "node:url";
import { BUMP_MODES, bumpVersion, prepareCommitVersion } from "./project-version.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const [mode, ...flags] = process.argv.slice(2);

try {
  if (mode === "commit" && flags.length === 0) {
    prepareCommitVersion(root);
  } else if (BUMP_MODES.includes(mode) && flags.every((flag) => ["--dry-run", "--stage"].includes(flag))) {
    bumpVersion(root, mode, { dryRun: flags.includes("--dry-run"), stage: flags.includes("--stage") });
  } else {
    throw new Error("Usage: node scripts/version-proxy.mjs <patch|minor|major> [--dry-run] [--stage]");
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
