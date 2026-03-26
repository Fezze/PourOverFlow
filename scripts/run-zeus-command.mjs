import { spawn } from "node:child_process";
import { resolveZeppAppRoot } from "./zepp-app-root.mjs";

const zeppAppRoot = resolveZeppAppRoot();
const zeusArgs = process.argv.slice(2);
const spawnCommand = process.platform === "win32" ? "cmd" : "zeus";
const spawnArgs = process.platform === "win32" ? ["/c", "zeus", ...zeusArgs] : zeusArgs;

if (zeusArgs.length === 0) {
  console.error("Usage: node scripts/run-zeus-command.mjs <zeus-args...>");
  process.exit(1);
}

const child = spawn(spawnCommand, spawnArgs, {
  cwd: zeppAppRoot,
  stdio: "inherit"
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
