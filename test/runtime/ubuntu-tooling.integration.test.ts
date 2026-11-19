import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it, vi } from "vitest";

it.skipIf(process.platform !== "linux")("runs the installed Ubuntu toolchain with a temporary simulator metadata directory", async () => {
  const root = await mkdtemp(join(tmpdir(), "pof-doctor-tools-"));
  vi.stubEnv("ZEPP_SIMULATOR_ROOT", root);
  const log = vi.spyOn(console, "log");
  try {
    await writeFile(join(root, "DevToolsActivePort"), "1234\n/devtools/browser/test");
    await writeFile(join(root, "last_app_info.json"), "{}");
    const { runUbuntuDoctor } = await import("../../scripts/doctor-ubuntu.mjs");
    expect(runUbuntuDoctor()).toBe(0);
    expect(log).toHaveBeenCalledWith(expect.stringContaining("local zeus: ok"));
    expect(log).toHaveBeenCalledWith(expect.stringContaining("playwright browser:"));
    expect(log).toHaveBeenCalledWith(`DevToolsActivePort: ok ${join(root, "DevToolsActivePort")}`);
  } finally {
    log.mockRestore();
    vi.unstubAllEnvs();
    await rm(root, { recursive: true, force: true });
  }
}, 30_000);
