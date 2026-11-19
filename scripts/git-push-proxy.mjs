import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { VERSION_FILES, bumpVersion } from "./project-version.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));

function git(args, { capture = true, allowMissing = false } = {}) {
  const result = spawnSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit"
  });
  if (result.error) throw result.error;
  if (allowMissing && result.status === 1) return "";
  if (result.status !== 0) throw new Error(result.stderr?.trim() || `git ${args[0]} failed.`);
  return result.stdout?.trim();
}

function assertCleanVersionFiles() {
  if (git(["status", "--porcelain", "--", ...VERSION_FILES])) {
    throw new Error("Commit pending changes to the version files before running npm run push.");
  }
}

function push(args) {
  const flags = args.filter((arg) => arg.startsWith("-"));
  const positionals = args.filter((arg) => !arg.startsWith("-"));
  const pushFlags = ["-u", "--set-upstream", "--force-with-lease"];
  if (positionals.length > 2 || flags.some((flag) => ![...pushFlags, "--dry-run"].includes(flag))) {
    throw new Error("Usage: npm run push -- [--dry-run] [-u] [--force-with-lease] [remote [destination-branch]]");
  }

  const branch = git(["symbolic-ref", "--short", "HEAD"]);
  const config = (key) => git(["config", "--get", `branch.${branch}.${key}`], { allowMissing: true });
  const [explicitRemote, destination] = positionals;
  const remote = explicitRemote || config("remote");
  const ref = destination === "HEAD" || (explicitRemote && !destination)
    ? `refs/heads/${branch}`
    : destination ? `refs/heads/${destination}` : config("merge");
  if (!remote || !ref.startsWith("refs/heads/")) {
    throw new Error("Set an upstream or specify a remote and destination branch.");
  }
  git(["check-ref-format", ref]);

  const pushArgs = ["push", ...flags.filter((flag) => pushFlags.includes(flag)), "--", remote, `HEAD:${ref}`];
  if (flags.includes("--dry-run")) {
    console.log(`Dry run: git ${pushArgs.join(" ")}`);
    console.log("A successful push would be followed by a minor version commit and a second push.");
    return;
  }

  assertCleanVersionFiles();
  const originalHead = git(["rev-parse", "HEAD"]);
  git(pushArgs, { capture: false });
  if (git(["rev-parse", "HEAD"]) !== originalHead || git(["symbolic-ref", "--short", "HEAD"]) !== branch) {
    throw new Error("The checked-out branch changed during the push. No version commit was created.");
  }
  assertCleanVersionFiles();

  bumpVersion(root, "minor", {
    afterWrite: ({ name }) => git(["commit", "--only", "-m", `Bump version to ${name}`, "--", ...VERSION_FILES], { capture: false })
  });
  try {
    git(pushArgs, { capture: false });
  } catch (error) {
    throw new Error(`${error.message} The version commit is local. Retry it with git push to the same destination.`);
  }
}

try {
  push(process.argv.slice(2));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
