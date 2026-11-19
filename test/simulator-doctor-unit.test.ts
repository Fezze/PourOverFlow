import { join, resolve } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { runSimulatorDoctor } from "../scripts/simulator-doctor.mjs";

const { access, readdir, readFile, stat } = vi.hoisted(() => ({
  access: vi.fn(), readdir: vi.fn(), readFile: vi.fn(), stat: vi.fn()
}));
vi.mock("node:fs/promises", () => ({ access, readdir, readFile, stat }));

const project = process.cwd();
const simulator = resolve("mock-simulator");
const deploy = join(simulator, "apps", "pour");
const fakeStat = (mtimeMs: number, directory = false) => ({
  mtimeMs, isDirectory: () => directory, isFile: () => !directory
});
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("ZEPP_SIMULATOR_ROOT", simulator);
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

it.each([[20_000, "fresh"], [1_000, "stale"]])("compares only nested source and deploy timestamps (%s)", async (time, status) => {
  readFile.mockResolvedValueOnce("4481\n/devtools/browser/fixture").mockResolvedValueOnce(JSON.stringify({
    user_app_path: join(project, "zepp-app"), sim_app_path: deploy
  }));
  stat.mockImplementation(async (file: string) => {
    if (file === deploy || file === join(deploy, "page") || file.endsWith("shared")) return fakeStat(0, true);
    return fakeStat(file === join(deploy, "page", "entry.js") ? time : 18_000);
  });
  readdir.mockImplementation(async (dir: string) => dir === deploy ? [{ name: "page" }]
    : dir === join(deploy, "page") ? [{ name: "entry.js" }] : []);
  expect(await runSimulatorDoctor(project)).toBe(0);
  expect(console.log).toHaveBeenCalledWith("DevTools endpoint: 127.0.0.1:4481");
  expect(console.log).toHaveBeenCalledWith(expect.stringContaining(`Deployment freshness: ${status}`));
});

it("diagnoses missing or damaged metadata without misreporting a stale deployment", async () => {
  readFile.mockRejectedValueOnce(new Error("missing port")).mockResolvedValueOnce("malformed");
  expect(await runSimulatorDoctor(project)).toBe(0);
  expect(console.log).toHaveBeenCalledWith("Last deployment: not found");
  readFile.mockResolvedValueOnce("4481").mockResolvedValueOnce(JSON.stringify({ user_app_path: "other" }));
  expect(await runSimulatorDoctor(project)).toBe(0);
  expect(console.log).toHaveBeenCalledWith("Last deployment belongs to this repo: no");
  expect(console.log).toHaveBeenCalledWith("Deployment freshness: unavailable");
  access.mockRejectedValueOnce(new Error("missing simulator"));
  expect(await runSimulatorDoctor(project)).toBe(1);
  expect(console.error).toHaveBeenCalledWith(expect.stringContaining("Could not find simulator root"));
});
