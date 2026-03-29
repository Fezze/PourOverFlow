import { spawn } from "node:child_process";
import { resolveZeppAppRoot } from "./zepp-app-root.mjs";

const zeppAppRoot = resolveZeppAppRoot();
const zeusArgs = process.argv.slice(2);
const spawnCommand = process.platform === "win32" ? "cmd" : "zeus";
const spawnArgs =
  process.platform === "win32"
    ? ["/d", "/s", "/c", buildWindowsZeusCommand(zeusArgs)]
    : zeusArgs;

if (zeusArgs.length === 0) {
  console.error("Usage: node scripts/run-zeus-command.mjs <zeus-args...>");
  process.exit(1);
}

process.chdir(zeppAppRoot);

const child = spawn(spawnCommand, spawnArgs, {
  stdio: "inherit"
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});

function buildWindowsZeusCommand(args) {
  return ["zeus", ...args].map(quoteWindowsCmdArg).join(" ");
}

function quoteWindowsCmdArg(arg) {
  if (!/[ \t"&()^<>|]/.test(arg)) {
    return arg;
  }

  return `"${String(arg).replace(/"/g, '\\"')}"`;
}
