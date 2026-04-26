import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { resolveZeppAppRoot } from "./zepp-app-root.mjs";

const zeppAppRoot = resolveZeppAppRoot();
const repoRoot = path.resolve(zeppAppRoot, "..");
const zeusArgs = process.argv.slice(2);
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

const child = spawn(zeusCommand, zeusArgs, {
  cwd: zeppAppRoot,
  stdio: "inherit",
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

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
