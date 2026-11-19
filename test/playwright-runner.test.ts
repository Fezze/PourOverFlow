import { EventEmitter } from "node:events";
import { join, resolve, sep } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { runPlaywrightValidation, runSimulatorCoverage } from "../scripts/playwright-simulator-coverage.mjs";

const { launch, createServer, readFile, readdir, mkdir, stat, writeFile, writeReports } = vi.hoisted(() => ({
  launch: vi.fn(), createServer: vi.fn(), readFile: vi.fn(), readdir: vi.fn(),
  mkdir: vi.fn(), stat: vi.fn(), writeFile: vi.fn(), writeReports: vi.fn()
}));
vi.mock("playwright-core", () => ({ chromium: { launch } }));
vi.mock("node:http", () => ({ default: { createServer } }));
vi.mock("node:fs/promises", () => ({ readFile, readdir, mkdir, stat, writeFile }));
vi.mock("../scripts/istanbul-coverage-report.mjs", () => ({ writeIstanbulReports: writeReports }));

const root = resolve("test", "simulator-fixture");
const deployed = join(root, "deployed");
const app = resolve("zepp-app");
const oldSource = join(app, "app.js");
const jsSource = "export function run() { return 42; }\n";
const summary = {
  lines: { pct: 100 }, statements: { pct: 100 }, functions: { pct: 100 }, branches: { pct: 100 }
};
const coveredFunctions = [{ functionName: "run", ranges: [{ startOffset: 0, endOffset: jsSource.length, count: 1 }], isBlockCoverage: true }];
const logger = () => vi.spyOn(console, "log").mockImplementation(() => {});

function setupFiles({ metadata = { user_app_path: app, sim_app_path: deployed }, deployedMtime = 10_000 } = {}) {
  readFile.mockImplementation(async (file: string) => {
    if (file.endsWith("DevToolsActivePort")) return "3827\n/devtools/browser/test\n";
    if (file.endsWith("last_app_info.json")) return JSON.stringify(metadata);
    return jsSource;
  });
  stat.mockImplementation(async (file: string) => {
    if (file.endsWith("missing.js")) throw new Error("File missing");
    if (file === deployed || file === join(deployed, "pages")) {
      return { isFile: () => false, isDirectory: () => true, mtimeMs: deployedMtime };
    }
    const mtimeMs = file.startsWith(`${deployed}${sep}`) ? deployedMtime : 9_000;
    return { isFile: () => true, isDirectory: () => false, mtimeMs };
  });
  readdir.mockImplementation(async (file: string) => [{ name: file === deployed ? "pages" : "main.js" }]);
}

function setupHarness(state = { status: "ready" }) {
  const server = Object.assign(new EventEmitter(), {
    listen: vi.fn((_port, _bind, done) => done()),
    address: vi.fn(() => ({ port: 4050 })),
    close: vi.fn((done) => done())
  });
  let handler;
  createServer.mockImplementation((callback) => { handler = callback; return server; });
  const page = {
    coverage: {
      startJSCoverage: vi.fn(),
      stopJSCoverage: vi.fn(() => [
        { url: "http://127.0.0.1:4050/zepp-app/app.js", functions: coveredFunctions },
        { url: "http://127.0.0.1:4050/zepp-app/missing.js", functions: coveredFunctions },
        { url: "https://excluded.example/script.js", functions: coveredFunctions }
      ])
    },
    goto: vi.fn(),
    waitForFunction: vi.fn(),
    evaluate: vi.fn(() => state),
    textContent: vi.fn(async () => "harness error")
  };
  const browser = { newPage: vi.fn(() => page), close: vi.fn() };
  launch.mockResolvedValue(browser);
  const request = async (url: string) => {
    const reply = { writeHead: vi.fn(), end: vi.fn() };
    await handler({ url }, reply);
    return reply;
  };
  return { page, browser, server, request };
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("ZEPP_SIMULATOR_ROOT", root);
  writeReports.mockResolvedValue(summary);
  setupFiles();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it("filters coverage to readable application files and closes every harness resource", async () => {
  const { browser, request, server, page } = setupHarness();
  const log = logger();
  launch.mockImplementationOnce(async () => {
    for (const [url, code, type] of [
      ["/test/frame.html", 200, "text/html; charset=utf-8"],
      ["/zepp-app/app.js", 200, "text/javascript; charset=utf-8"],
      ["/zepp-app/app.json", 200, "application/json; charset=utf-8"],
      ["/note.txt", 200, "text/plain; charset=utf-8"],
      ["/..%2fprivate.txt", 404, undefined],
      ["/zepp-app/missing.js", 404, undefined],
      ["/%xx", 500, undefined]
    ] as const) {
      const response = await request(url);
      expect(response.writeHead.mock.calls[0]?.[0], url).toBe(code);
      if (type) expect(response.writeHead.mock.calls[0]?.[1]).toMatchObject({ "Content-Type": type });
    }
    return browser;
  });
  expect(await runPlaywrightValidation(["--module-harness", "--coverage", "--verbose", "--output-dir", "report"])).toBe(0);
  expect(page.coverage.startJSCoverage).toHaveBeenCalledOnce();
  expect(writeReports.mock.calls[0][0].files()).toEqual(["zepp-app/app.js"]);
  expect(log).toHaveBeenCalledWith(expect.stringContaining("Lines 100%"));
  expect(browser.close).toHaveBeenCalledOnce();
  expect(server.close).toHaveBeenCalledOnce();
});

it("checks readiness in smoke mode and cleans up after harness or launch errors", async () => {
  const { browser, server, page } = setupHarness();
  const error = vi.spyOn(console, "error").mockImplementation(() => {});
  expect(await runPlaywrightValidation(["--module-harness"])).toBe(0);
  expect(page.coverage.startJSCoverage).not.toHaveBeenCalled();
  page.evaluate.mockReturnValueOnce({ status: "error" });
  expect(await runPlaywrightValidation(["--module-harness"])).toBe(1);
  expect(error).toHaveBeenCalledWith(expect.stringContaining("Module harness failed: harness error"));
  launch.mockRejectedValueOnce(new Error("Chromium unavailable"));
  expect(await runPlaywrightValidation(["--module-harness"])).toBe(1);
  expect(browser.close).toHaveBeenCalledTimes(2);
  expect(server.close).toHaveBeenCalledTimes(3);
  expect(await runPlaywrightValidation(["--coverage"])).toBe(1);
  expect(error).toHaveBeenCalledWith(expect.stringContaining("Simulator Playwright V8 coverage was removed"));
});

it.each([
  [null, "metadata is missing"],
  [{ user_app_path: resolve("test"), sim_app_path: deployed }, "points at"],
  [{ user_app_path: app }, "does not contain sim_app_path"],
  [{ user_app_path: app, sim_app_path: deployed }, "deployment is stale"]
])("stops before contacting DevTools on invalid deployment metadata (%j)", async (metadata, message) => {
  setupFiles({ metadata, deployedMtime: 1 });
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  const error = vi.spyOn(console, "error").mockImplementation(() => {});
  expect(await runPlaywrightValidation([])).toBe(1);
  expect(error).toHaveBeenCalledWith(expect.stringContaining(message));
  expect(fetch).not.toHaveBeenCalled();
});

it("polls and deduplicates inspectable pages and translates a rejected connection", async () => {
  vi.useFakeTimers({ now: 20_000 });
  const log = logger();
  const error = vi.spyOn(console, "error").mockImplementation(() => {});
  const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => [
    { url: "file:///watch.html" }, { url: "file:///watch.html" }, { url: "devtools://tools" }
  ] });
  vi.stubGlobal("fetch", fetch);
  const run = runPlaywrightValidation(["--duration-ms", "650", "--verbose"]);
  await vi.advanceTimersByTimeAsync(1100);
  expect(await run).toBe(0);
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(log.mock.calls.filter(([message]) => message.startsWith("Observed simulator page:"))).toHaveLength(1);
  fetch.mockRejectedValueOnce(new Error("ECONNREFUSED"));
  expect(await runPlaywrightValidation([])).toBe(1);
  expect(error).toHaveBeenCalledWith(expect.stringContaining("endpoint was not reachable"));
});

it("matches CDP request ids, maps script results and releases the profiler socket", async () => {
  vi.useFakeTimers({ now: 20_000 });
  const sent: string[] = [];
  const close = vi.fn();
  class Socket extends EventTarget {
    static OPEN = 1;
    readyState = Socket.OPEN;
    constructor() {
      super();
      queueMicrotask(() => this.dispatchEvent(new Event("open")));
    }
    send(message: string) {
      const request = JSON.parse(message);
      sent.push(request.method);
      const payload = request.method === "Profiler.takePreciseCoverage"
        ? { result: [{ url: oldSource, functions: coveredFunctions }] } : {};
      queueMicrotask(() => this.dispatchEvent(new MessageEvent("message", {
        data: JSON.stringify({ id: request.id, result: payload })
      })));
    }
    close() {
      close();
      this.dispatchEvent(new Event("close"));
    }
  }
  vi.stubGlobal("WebSocket", Socket);
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [
    { url: "file:///watch.html", webSocketDebuggerUrl: "ws://local-fixture/devtools" },
    { url: "file:///watch.html", webSocketDebuggerUrl: "ws://local-fixture/devtools" }
  ] }));
  const run = runSimulatorCoverage({ durationMs: 20, outputDir: "report", collectCoverage: true, verbose: true });
  await vi.advanceTimersByTimeAsync(550);
  await run;
  expect(sent).toEqual([
    "Profiler.enable", "Profiler.startPreciseCoverage", "Profiler.takePreciseCoverage",
    "Profiler.stopPreciseCoverage", "Profiler.disable"
  ]);
  expect(close).toHaveBeenCalledOnce();
  expect(writeReports.mock.calls[0][0].files()).toEqual(["zepp-app/app.js"]);
});

it("reports malformed DevTools responses and requires at least one inspectable page", async () => {
  vi.useFakeTimers({ now: 20_000 });
  const errors = vi.spyOn(console, "error").mockImplementation(() => {});
  const fetch = vi.fn().mockResolvedValueOnce({ ok: false, status: 503 })
    .mockResolvedValue({ ok: true, json: async () => ({ unexpected: "response" }) });
  vi.stubGlobal("fetch", fetch);
  expect(await runPlaywrightValidation(["--duration-ms", "10"])).toBe(1);
  expect(errors).toHaveBeenCalledWith(expect.stringContaining("status 503"));
  const empty = runPlaywrightValidation(["--duration-ms", "10"]);
  await vi.advanceTimersByTimeAsync(550);
  expect(await empty).toBe(1);
  expect(errors).toHaveBeenCalledWith(expect.stringContaining("no inspectable simulator pages"));
});
