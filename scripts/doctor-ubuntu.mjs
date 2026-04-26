import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
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
const defaultSimulatorRoot = path.join(
  process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config"),
  "simulator"
);
const simulatorRoot = process.env.ZEPP_SIMULATOR_ROOT || defaultSimulatorRoot;
const browserCandidates = [
  process.env.PLAYWRIGHT_COVERAGE_BROWSER,
  "/snap/bin/chromium",
  "/usr/bin/chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/microsoft-edge",
  "/usr/bin/chromium-browser"
].filter(Boolean);

let hasFailures = false;

function logOk(label, detail) {
  console.log(`${label}: ok ${detail}`);
}

function logWarn(label, detail) {
  console.log(`${label}: warn ${detail}`);
}

function logFail(label, detail) {
  hasFailures = true;
  console.log(`${label}: fail ${detail}`);
}

function parseMajor(version) {
  const match = /v?(\d+)/.exec(version || "");
  return match ? Number(match[1]) : Number.NaN;
}

function runCommand(command, args, extraEnv = {}) {
  return spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      ...extraEnv
    }
  });
}

function checkNode() {
  const major = parseMajor(process.version);
  if (major === 24) {
    logOk("node", process.version);
    return;
  }

  if (major === 22) {
    logWarn("node", `${process.version} (fallback supported if Zeus compatibility requires it)`);
    return;
  }

  logFail("node", `${process.version} (expected Node 24.x, fallback 22.x only if Zeus breaks)`);
}

function checkNpm() {
  const result = runCommand("npm", ["-v"]);
  if (result.status !== 0) {
    logFail("npm", (result.stderr || "unable to detect npm").trim());
    return;
  }

  const version = result.stdout.trim();
  const major = parseMajor(version);
  if (major === 11) {
    logOk("npm", version);
    return;
  }

  if (major === 10) {
    logWarn("npm", `${version} (fallback supported with Node 22)`);
    return;
  }

  logFail("npm", `${version} (expected npm 11.x, fallback 10.x only with Node 22)`);
}

function checkZeus() {
  if (fs.existsSync(localZeusPath)) {
    const versionResult = runCommand(localZeusPath, ["-v"], {
      NODE_PATH: fs.existsSync(localZeusPrivateModulesPath)
        ? process.env.NODE_PATH
          ? `${localZeusPrivateModulesPath}${path.delimiter}${process.env.NODE_PATH}`
          : localZeusPrivateModulesPath
        : process.env.NODE_PATH
    });
    if (versionResult.status === 0) {
      logOk("local zeus", `${localZeusPath} (${versionResult.stdout.trim()})`);
      return;
    }

    logFail("local zeus", `${localZeusPath} exists but failed to run: ${(versionResult.stderr || versionResult.stdout).trim()}`);
    return;
  }

  const globalResult = runCommand("bash", ["-lc", "command -v zeus"]);
  if (globalResult.status === 0) {
    logWarn("local zeus", `missing; global fallback available at ${globalResult.stdout.trim()}`);
    return;
  }

  logFail("local zeus", "missing; run npm ci to install @zeppos/zeus-cli locally");
}

function checkBrowser() {
  const browserPath = browserCandidates.find((candidate) => fs.existsSync(candidate));
  if (!browserPath) {
    logFail(
      "playwright browser",
      "missing; set PLAYWRIGHT_COVERAGE_BROWSER to a Chromium-family executable"
    );
    return;
  }

  const headlessResult = runCommand(browserPath, ["--headless=new", "--disable-gpu", "--version"]);
  if (headlessResult.status === 0) {
    logOk("playwright browser", `${browserPath} (${headlessResult.stdout.trim()})`);
    return;
  }

  logWarn(
    "playwright browser",
    `${browserPath} found but headless launch check failed: ${(headlessResult.stderr || headlessResult.stdout).trim()}`
  );
}

function checkSimulator() {
  if (fs.existsSync(simulatorRoot)) {
    logOk("simulator root", simulatorRoot);
  } else {
    logWarn("simulator root", `${simulatorRoot} (set ZEPP_SIMULATOR_ROOT if your simulator lives elsewhere)`);
  }

  const devToolsPath = path.join(simulatorRoot, "DevToolsActivePort");
  if (fs.existsSync(devToolsPath)) {
    logOk("DevToolsActivePort", devToolsPath);
  } else {
    logWarn("DevToolsActivePort", "missing - start the simulator before running simulator smoke checks");
  }

  const lastAppInfoPath = path.join(simulatorRoot, "last_app_info.json");
  if (fs.existsSync(lastAppInfoPath)) {
    logOk("last_app_info", lastAppInfoPath);
  } else {
    logWarn("last_app_info", "missing - deploy with npm run zepp:dev -- ... before trusting simulator smoke results");
  }
}

function checkDisplayServer() {
  const displayServer = process.env.WAYLAND_DISPLAY
    ? `wayland:${process.env.WAYLAND_DISPLAY}`
    : process.env.DISPLAY
      ? `x11:${process.env.DISPLAY}`
      : null;

  if (displayServer) {
    logOk("display server", displayServer);
    return;
  }

  logWarn("display server", "missing DISPLAY/WAYLAND_DISPLAY; headless browser harness may still work, simulator UI automation may not");
}

function main() {
  console.log("PourOverFlow Ubuntu doctor");
  checkNode();
  checkNpm();
  checkZeus();
  checkBrowser();
  checkSimulator();
  checkDisplayServer();

  if (hasFailures) {
    process.exitCode = 1;
    return;
  }

  console.log("doctor: completed without blocking failures");
}

main();