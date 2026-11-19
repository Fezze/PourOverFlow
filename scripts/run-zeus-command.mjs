import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { resolveZeppAppRoot } from "./zepp-app-root.mjs";
import { bumpVersion } from "./project-version.mjs";

const zeppAppRoot = resolveZeppAppRoot();
const repoRoot = path.resolve(zeppAppRoot, "..");
const wrapperArgs = process.argv.slice(2);
const noVersionBump = wrapperArgs.includes("--no-version-bump");
const dryRun = wrapperArgs.includes("--dry-run");
const zeusArgs = wrapperArgs.filter((arg) => arg !== "--no-version-bump" && arg !== "--dry-run");
const localZeusPath = path.join(
  repoRoot,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "zeus.cmd" : "zeus"
);
const localZeusPrivateModulesPath = path.join(
  repoRoot,
  "node_modules",
  "@zeppos",
  "zeus-cli",
  "private-modules"
);
const zeusCommand = fs.existsSync(localZeusPath)
  ? localZeusPath
  : process.platform === "win32"
    ? "zeus.cmd"
    : "zeus";

if (zeusArgs.length === 0) {
  console.error("Usage: node scripts/run-zeus-command.mjs <zeus-args...>");
  process.exit(1);
}

if (!noVersionBump && ["build", "dev"].includes(zeusArgs[0])) {
  try {
    bumpVersion(repoRoot, "patch", { dryRun });
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

if (dryRun) {
  console.log(`Dry run: zeus ${zeusArgs.join(" ")}`);
  process.exit(0);
}

const child = spawn(zeusCommand, zeusArgs, {
  cwd: zeppAppRoot,
  stdio: zeusArgs[0] === "build" ? ["inherit", "pipe", "pipe"] : "inherit",
  shell: process.platform === "win32",
  env: {
    ...process.env,
    NODE_PATH:
      fs.existsSync(localZeusPrivateModulesPath) && zeusCommand === localZeusPath
        ? process.env.NODE_PATH
          ? `${localZeusPrivateModulesPath}${path.delimiter}${process.env.NODE_PATH}`
          : localZeusPrivateModulesPath
        : process.env.NODE_PATH
  }
});

child.on("error", (error) => {
  console.error(`Cannot run Zeus: ${error.message}`);
});

let unresolvedImport = false;
if (zeusArgs[0] === "build") {
  for (const [source, destination] of [[child.stdout, process.stdout], [child.stderr, process.stderr]]) {
    let recentOutput = "";
    source.on("data", (chunk) => {
      destination.write(chunk);
      recentOutput = (recentOutput + chunk.toString()).slice(-8192);
      if (recentOutput.includes("could not be resolved") || recentOutput.includes("UNRESOLVED_IMPORT")) {
        unresolvedImport = true;
      }
    });
  }
}

child.on("close", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  if (unresolvedImport) {
    console.error("Zeus left an unresolved import in the build; refusing to report success.");
  }
  process.exit(code === 0 && unresolvedImport ? 1 : (code ?? 1));
});
