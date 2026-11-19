import { basename, delimiter, join } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const { existsSync, spawnSync } = vi.hoisted(() => ({
  existsSync: vi.fn<(path: string) => boolean>(),
  spawnSync: vi.fn()
}));

vi.mock("node:fs", () => ({ default: { existsSync } }));
vi.mock("node:child_process", () => ({ spawnSync }));

const simulator = join("fixture", "simulator");
const chromium = join("fixture", "chromium");
const succeeded = (stdout: string) => ({ status: 0, stdout, stderr: "" });
const failed = (stderr: string) => ({ status: 1, stdout: "", stderr });

beforeEach(() => {
  vi.resetModules();
  existsSync.mockReset();
  spawnSync.mockReset();
  vi.stubEnv("ZEPP_SIMULATOR_ROOT", simulator);
  vi.stubEnv("PLAYWRIGHT_COVERAGE_BROWSER", chromium);
  vi.stubEnv("DISPLAY", undefined);
  vi.stubEnv("WAYLAND_DISPLAY", undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

async function runDoctor() {
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  const originalExitCode = process.exitCode;
  try {
    process.exitCode = 0;
    await import("../scripts/doctor-ubuntu.mjs");
    return {
      code: process.exitCode,
      output: log.mock.calls.map((args) => args.join(" ")).join("\n")
    };
  } finally {
    process.exitCode = originalExitCode;
  }
}

it("validates the local toolchain and preserves the caller's NODE_PATH for Zeus", async () => {
  vi.stubEnv("WAYLAND_DISPLAY", "wayland-test");
  vi.stubEnv("NODE_PATH", "extra-modules");
  existsSync.mockReturnValue(true);
  spawnSync
    .mockReturnValueOnce(succeeded("11.0.0"))
    .mockReturnValueOnce(succeeded("Zeus 1.9.0"))
    .mockReturnValueOnce(succeeded("Chromium"));
  const { code, output } = await runDoctor();

  expect(code).toBe(0);
  expect(output).toContain("local zeus: ok");
  expect(output).toContain("DevToolsActivePort: ok");
  expect(output).toContain("last_app_info: ok");
  expect(output).toContain("display server: ok wayland:wayland-test");
  const [zeus, versionArgs, options] = spawnSync.mock.calls[1];
  expect(basename(zeus)).toBe(process.platform === "win32" ? "zeus.cmd" : "zeus");
  expect(versionArgs).toEqual(["-v"]);
  expect(options.env.NODE_PATH).toMatch(new RegExp(`private-modules${delimiter}extra-modules$`));
  expect(spawnSync).toHaveBeenLastCalledWith(chromium, ["--headless=new", "--disable-gpu", "--version"], expect.anything());
});

it("keeps a fallback or missing simulator metadata as warnings", async () => {
  existsSync.mockImplementation((candidate) => candidate === chromium);
  spawnSync
    .mockReturnValueOnce(succeeded("10.9.0"))
    .mockReturnValueOnce(succeeded("/tools/zeus"))
    .mockReturnValueOnce(failed("Headless launch failed"));
  const { code, output } = await runDoctor();

  expect(code).toBe(0);
  expect(output).toContain("npm: warn 10.9.0");
  expect(output).toContain("local zeus: warn missing; global fallback available at /tools/zeus");
  expect(output).toContain("headless launch check failed");
  expect(output).toContain("DevToolsActivePort: warn missing");
  expect(output).toContain("display server: warn missing");
  expect(output).toContain("completed without blocking failures");
});

it("exits nonzero and reports each missing required tool", async () => {
  existsSync.mockReturnValue(false);
  spawnSync
    .mockReturnValueOnce(failed("npm unavailable"))
    .mockReturnValueOnce(failed(""));
  const { code, output } = await runDoctor();

  expect(code).toBe(1);
  expect(output).toContain("npm: fail npm unavailable");
  expect(output).toContain("local zeus: fail missing; run npm ci");
  expect(output).toContain("playwright browser: fail missing");
  expect(output).not.toContain("completed without blocking failures");
  expect(spawnSync).toHaveBeenCalledTimes(2);
});
