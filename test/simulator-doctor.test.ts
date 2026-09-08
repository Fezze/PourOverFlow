import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, utimesSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, test } from "vitest";

test.each(["fresh", "stale"])("simulator doctor detects a %s nested deployment", (freshness) => {
  const root = mkdtempSync(path.join(tmpdir(), "pof-doctor-"));
  const projectRoot = path.resolve(__dirname, "..");
  try {
    const deployed = path.join(root, "app", "device", "page");
    mkdirSync(deployed, { recursive: true });
    const file = path.join(deployed, "index.js");
    writeFileSync(file, "Page({})");
    const timestamp = freshness === "fresh" ? Date.now() / 1000 + 3600 : 1;
    utimesSync(file, timestamp, timestamp);
    writeFileSync(path.join(root, "last_app_info.json"), JSON.stringify({
      user_app_path: path.join(projectRoot, "zepp-app"), sim_app_path: path.join(root, "app")
    }));
    const output = execFileSync(process.execPath, ["scripts/simulator-doctor.mjs"], {
      cwd: projectRoot, env: { ...process.env, ZEPP_SIMULATOR_ROOT: root }, encoding: "utf8"
    });
    expect(output).toContain(`Deployment freshness: ${freshness}`);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
