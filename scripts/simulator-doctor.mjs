import os from "node:os";
import path from "node:path";
import { access, readFile, readdir, stat } from "node:fs/promises";

import {
  getSimulatorAppSourceCandidates,
  isSimulatorDeploymentForCurrentProject,
  parseDevToolsActivePort,
  resolveSimulatorRoot
} from "./playwright-coverage-helpers.mjs";

const PROJECT_ROOT = process.cwd();

await main();

async function main() {
  try {
    const simulatorRoot = resolveSimulatorRoot({
      env: process.env,
      platform: process.platform,
      homeDir: os.homedir()
    });
    const devToolsActivePortPath = path.join(simulatorRoot, "DevToolsActivePort");
    const lastAppInfoPath = path.join(simulatorRoot, "last_app_info.json");

    console.log(`Simulator root: ${simulatorRoot}`);
    await assertPathExists(simulatorRoot, "simulator root");

    const devToolsActivePort = await readOptionalText(devToolsActivePortPath);
    if (devToolsActivePort) {
      const devToolsInfo = parseDevToolsActivePort(devToolsActivePort);
      console.log(`DevTools endpoint: 127.0.0.1:${devToolsInfo.port}`);
    } else {
      console.log("DevTools endpoint: not running or DevToolsActivePort is missing");
    }

    const lastAppInfo = await readOptionalJson(lastAppInfoPath);
    if (!lastAppInfo) {
      console.log("Last deployment: not found");
      return;
    }

    const belongsToProject = isSimulatorDeploymentForCurrentProject(lastAppInfo, PROJECT_ROOT);
    console.log(`Last deployment belongs to this repo: ${belongsToProject ? "yes" : "no"}`);

    if (lastAppInfo.user_app_path) {
      console.log(`Last user app path: ${lastAppInfo.user_app_path}`);
    }

    const freshness = await resolveDeploymentFreshness(lastAppInfo);
    if (freshness) {
      console.log(
        `Deployment freshness: ${freshness.isFresh ? "fresh" : "stale"} ` +
        `(latest source ${new Date(freshness.latestSourceMtimeMs).toISOString()}, ` +
        `deployed ${new Date(freshness.deployedMtimeMs).toISOString()})`
      );
    } else {
      console.log("Deployment freshness: unavailable");
    }
  } catch (error) {
    console.error(`Simulator doctor failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}

async function assertPathExists(targetPath, label) {
  try {
    await access(targetPath);
  } catch {
    throw new Error(`Could not find ${label} at ${targetPath}. Set ZEPP_SIMULATOR_ROOT if it lives elsewhere.`);
  }
}

async function readOptionalText(filePath) {
  try {
    return await readFile(filePath, "utf8");
  } catch {
    return null;
  }
}

async function readOptionalJson(filePath) {
  const payload = await readOptionalText(filePath);
  if (!payload) {
    return null;
  }

  try {
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

async function resolveDeploymentFreshness(lastAppInfo) {
  if (!lastAppInfo?.sim_app_path) {
    return null;
  }

  const sourceCandidates = getSimulatorAppSourceCandidates(PROJECT_ROOT);
  const sourceTimes = await Promise.all(sourceCandidates.map(readMtimeMs));
  const latestSourceMtimeMs = Math.max(...sourceTimes.filter(Number.isFinite));
  const deployedMtimeMs = await readMtimeMs(lastAppInfo.sim_app_path);

  if (!Number.isFinite(latestSourceMtimeMs) || !Number.isFinite(deployedMtimeMs)) {
    return null;
  }

  return {
    latestSourceMtimeMs,
    deployedMtimeMs,
    isFresh: deployedMtimeMs + 2000 >= latestSourceMtimeMs
  };
}

async function readMtimeMs(targetPath) {
  try {
    const fileStat = await stat(targetPath);
    if (fileStat.isDirectory()) {
      return await readNewestChildMtimeMs(targetPath);
    }

    return fileStat.mtimeMs;
  } catch {
    return Number.NaN;
  }
}

async function readNewestChildMtimeMs(directoryPath) {
  const entries = await readdir(directoryPath, { withFileTypes: true });
  const mtimes = await Promise.all(entries.map((entry) => readMtimeMs(path.join(directoryPath, entry.name))));
  return Math.max(...mtimes.filter(Number.isFinite), Number.NaN);
}
