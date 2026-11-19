import { isCliEntry } from "./cli-entry.mjs";
import { fileURLToPath } from "node:url";
import { BUMP_MODES, bumpVersion, prepareCommitVersion } from "./project-version.mjs";

export function runVersionProxy([mode, ...flags] = process.argv.slice(2), root = fileURLToPath(new URL("../", import.meta.url))) {
  try {
    if (mode === "commit" && flags.length === 0) {
      prepareCommitVersion(root);
    } else if (BUMP_MODES.includes(mode) && flags.every((flag) => ["--dry-run", "--stage"].includes(flag))) {
      bumpVersion(root, mode, { dryRun: flags.includes("--dry-run"), stage: flags.includes("--stage") });
    } else {
      throw new Error("Usage: node scripts/version-proxy.mjs <patch|minor|major> [--dry-run] [--stage]");
    }
    return 0;
  } catch (error) {
    console.error(error.message);
    return 1;
  }
}

if (isCliEntry(import.meta.url)) {
  process.exitCode = runVersionProxy();
}
