import { createServer } from "node:http";
import { mkdtemp, mkdir, readFile, rm, stat, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { runPhonePreview } from "../../scripts/phone-preview.mjs";
import { runPlaywrightValidation } from "../../scripts/playwright-simulator-coverage.mjs";
import { runSimulatorDoctor } from "../../scripts/simulator-doctor.mjs";
import { runWatchPreview } from "../../scripts/watch-preview.mjs";

let root: string;
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "pof-preview-tests-"));
});
afterEach(async () => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  await rm(root, { recursive: true, force: true });
});

it("renders both screen shapes from generated watch fixtures", async () => {
  await runWatchPreview({ previewRoot: root, verify: true });
  const scenes = JSON.parse(await readFile(join(root, "fixtures", "manifest.json"), "utf8"));
  expect(new Set(scenes.map(({ shape }) => shape))).toEqual(new Set(["round", "square"]));
  for (const scene of [scenes[0], scenes.at(-1)]) {
    expect((await stat(join(root, "verify", scene.screenshotFile))).size).toBeGreaterThan(4096);
  }
}, 120_000);

it("renders real Settings components in Chromium and executes the recipe and history flows", async () => {
  await runPhonePreview([], { outputDir: root });
  const readme = await readFile(join(root, "README.txt"), "utf8");
  expect(readme).toContain("Scenarios verified: 72");
  for (const locale of ["en-US", "pl-PL"]) {
    expect((await stat(join(root, locale, "recipe-editor-33-steps-390.png"))).size).toBeGreaterThan(1000);
  }
  await runPhonePreview(["--verify-flow"]);
}, 90_000);

it("collects application-code coverage from the live module harness", async () => {
  expect(await runPlaywrightValidation(["--module-harness", "--coverage", "--output-dir", root])).toBe(0);
  const metadata = JSON.parse(await readFile(join(root, "metadata.json"), "utf8"));
  const files = metadata.convertedFiles.map(({ displayPath }) => displayPath);
  expect(metadata.relevantEntryCount).toBeGreaterThan(0);
  expect(files).toContain("zepp-app/shared/engine/session-reducer.js");
  expect((await readFile(join(root, "lcov.info"), "utf8"))).toContain("SF:");
}, 35_000);

it("validates simulator metadata and polls only inspectable DevTools pages", async () => {
  const deployed = join(root, "deployed");
  await mkdir(join(deployed, "page"), { recursive: true });
  const pageFile = join(deployed, "page", "index.js");
  await writeFile(pageFile, "Page({});");
  const fresh = new Date(Date.now() + 60_000);
  await utimes(pageFile, fresh, fresh);
  await writeFile(join(root, "last_app_info.json"), JSON.stringify({
    user_app_path: resolve("zepp-app"), sim_app_path: deployed
  }));
  vi.stubEnv("ZEPP_SIMULATOR_ROOT", root);
  const requests: string[] = [];
  const server = createServer((request, response) => {
    requests.push(request.url ?? "");
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify([
      { url: "devtools://devtools", title: "Debugger" },
      { url: "file:///fixture/watch.html", title: "Watch" }
    ]));
  });
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  try {
    const { port } = server.address() as { port: number };
    await writeFile(join(root, "DevToolsActivePort"), `${port}\n/devtools/browser/test\n`);
    const log = vi.spyOn(console, "log");
    expect(await runSimulatorDoctor()).toBe(0);
    expect(log).toHaveBeenCalledWith(expect.stringContaining("Deployment freshness: fresh"));
    const args = ["--simulator", "--duration-ms", "30", "--verbose"];
    expect(await runPlaywrightValidation(args)).toBe(0);
    expect(requests).toEqual(["/json/list"]);
    expect(log).toHaveBeenCalledWith("Observed simulator page: file:///fixture/watch.html");
    expect(log).not.toHaveBeenCalledWith("Observed simulator page: devtools://devtools");

    await utimes(pageFile, new Date(1_000), new Date(1_000));
    await utimes(join(deployed, "page"), new Date(1_000), new Date(1_000));
    await utimes(deployed, new Date(1_000), new Date(1_000));
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await runPlaywrightValidation(args)).toBe(1);
    expect(error).toHaveBeenCalledWith(expect.stringContaining("deployment is stale"));
    expect(requests).toHaveLength(1);
  } finally {
    await new Promise<void>((done, reject) => server.close((error) => error ? reject(error) : done()));
  }
}, 10_000);

it("runs the shared storage, validation and session contracts in the Node host", async () => {
  const status = { textContent: "" };
  const results = { textContent: "" };
  vi.stubGlobal("document", { querySelector: (selector: string) => selector === "#status" ? status : results });
  vi.stubGlobal("window", {});
  try {
    await import("../fixtures/playwright-coverage/module-harness.js");
    expect(status.textContent).toMatch(/^ready:/);
    expect(JSON.parse(results.textContent).flows).toEqual(expect.arrayContaining([
      "legacy-phone-library-migration", "resume-a-persisted-brew", "phone-store-and-normalize"
    ]));
  } finally {
    vi.unstubAllGlobals();
  }
});
