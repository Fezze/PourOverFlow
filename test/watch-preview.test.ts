import { EventEmitter } from "node:events";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { runWatchPreview } from "../scripts/watch-preview.mjs";

const { launch, access, mkdir, readFile, rm, stat, spawn, createServer } = vi.hoisted(() => ({
  launch: vi.fn(), access: vi.fn(), mkdir: vi.fn(), readFile: vi.fn(), rm: vi.fn(),
  stat: vi.fn(), spawn: vi.fn(), createServer: vi.fn()
}));
vi.mock("playwright-core", () => ({ chromium: { launch } }));
vi.mock("node:fs/promises", () => ({ access, mkdir, readFile, rm, stat }));
vi.mock("node:child_process", () => ({ spawn }));
vi.mock("node:http", () => ({ default: { createServer } }));

const scenes = [
  { name: "brewers", page: "tool-list", state: "populated", shape: "round", width: 416, height: 416,
    fixtureFile: "brewers.json", screenshotFile: "brewers.png" },
  { name: "reading", page: "recipe-detail", state: "overflow", shape: "square", width: 390, height: 450 }
];
const brewerFixture = {
  scenario: "brewers",
  widgets: [{
    type: "SCROLL_LIST",
    data_array: [{ label: "AeroPress", icon: "aero.png" }],
    data_type_config: [{ start: 0, end: 0, type_id: 3 }],
    item_config: [{ type_id: 3, image_view: [{ x: 1, y: 2, w: 24, h: 24, key: "icon" }],
      text_view: [{ x: 28, y: 5, w: 100, h: 14, key: "label" }] }]
  }]
};

function setup({ wrongRow = false, clipped = false, moved = false, hiddenTail = false, small = false, wrongSize = false } = {}) {
  let handleRequest;
  const server = Object.assign(new EventEmitter(), {
    listen: vi.fn((_port, _bind, done) => done()),
    address: vi.fn(() => ({ port: 3434 })),
    close: vi.fn((done) => done())
  });
  createServer.mockImplementation((handler) => { handleRequest = handler; return server; });
  const request = async (url: string) => {
    const response = { writeHead: vi.fn(), end: vi.fn() };
    await handleRequest({ url }, response);
    return response;
  };
  access.mockResolvedValue(undefined);
  spawn.mockImplementation(() => {
    const child = new EventEmitter();
    queueMicrotask(() => child.emit("exit", 0));
    return child;
  });
  stat.mockImplementation(async (file: string) => {
    if (file.endsWith("missing.js")) throw new Error("Not found");
    return { isDirectory: () => file.endsWith("watch-preview") };
  });
  readFile.mockImplementation(async (file: string) => {
    if (file.endsWith("manifest.json")) return JSON.stringify(scenes);
    if (file.endsWith("brewers.json")) return JSON.stringify(brewerFixture);
    return "fixture payload";
  });
  let scene = scenes[0];
  let buttonRead = 0;
  let paragraphRead = 0;
  const screenshot = vi.fn(() => {
    const png = Buffer.alloc(small ? 40 : 4200);
    png.writeUInt32BE(scene.width + Number(wrongSize), 16);
    png.writeUInt32BE(scene.height, 20);
    return png;
  });
  const listeners = new Map();
  const page = {
    on: vi.fn((event, callback) => { listeners.set(event, callback); }),
    goto: vi.fn((url: string) => {
      scene = scenes.find(({ name }) => name === new URL(url).searchParams.get("scenario"))!;
    }),
    waitForFunction: vi.fn(),
    evaluate: vi.fn(),
    locator: vi.fn((selector: string) => ({
      first: () => ({ evaluate: () => wrongRow ? [] : [[1, 2, 24, 24, "aero.png"], [28, 5, 100, 14, "AeroPress"]] }),
      last: () => ({ evaluate: () => selector === ".scroll-card" ? false : (++paragraphRead === 2 ? !hiddenTail : undefined) }),
      filter() { return this; },
      screenshot,
      evaluate: vi.fn(),
      evaluateAll: () => {
        switch (selector) {
          case ".text > span": return clipped ? [{ text: "Instruction", outside: true }] : [];
          case "#watch-face > .button": return [{ x: moved && ++buttonRead > 1 ? 5 : 3 }];
          case ".reading-page, .scroll-list": return true;
          default: throw new Error(`Unexpected selector ${selector}`);
        }
      }
    }))
  };
  const browser = { newPage: vi.fn(() => page), close: vi.fn() };
  launch.mockResolvedValue(browser);
  return { browser, server, page, request, screenshot, listeners };
}

beforeEach(() => vi.resetAllMocks());
afterEach(() => vi.restoreAllMocks());

it("exports fixtures, checks brewer rows and captures watch faces, frames and scrolling", async () => {
  const { browser, server, request, screenshot } = setup();
  launch.mockImplementationOnce(async () => {
    for (const [url, code, type] of [
      ["/favicon.ico", 204, undefined],
      ["/nowhere", 404, undefined],
      ["/watch-preview-fixtures/..%2fprivate.txt", 403, undefined],
      ["/watch-preview-fixtures/missing.js", 404, undefined],
      ["/test/fixtures/watch-preview/", 200, "text/html; charset=utf-8"],
      ["/test/fixtures/watch-preview/renderer.js", 200, "text/javascript; charset=utf-8"],
      ["/watch-preview-fixtures/manifest.json", 200, "application/json; charset=utf-8"],
      ["/zepp-app/assets/aero.png", 200, "image/png"],
      ["/zepp-app/assets/other.bin", 200, "application/octet-stream"]
    ] as const) {
      const response = await request(url);
      expect(response.writeHead.mock.calls[0]?.[0], url).toBe(code);
      if (type) expect(response.writeHead.mock.calls[0]?.[1]).toMatchObject({ "Content-Type": type });
    }
    return browser;
  });
  await runWatchPreview({ previewRoot: "preview", verify: true, framed: true });
  expect(spawn).toHaveBeenCalledWith(process.execPath, expect.arrayContaining(["test/watch-preview-fixtures.preview.ts"]),
    expect.objectContaining({ env: expect.objectContaining({ WATCH_PREVIEW_OUTPUT: "preview" }) }));
  const paths = screenshot.mock.calls.map(([options]) => options.path);
  expect(paths).toEqual(expect.arrayContaining([
    expect.stringContaining(join("verify", "brewers.png")),
    expect.stringContaining(join("verify-framed", "brewers.png")),
    expect.stringContaining("recipe-detail-overflow-reading.png"),
    expect.stringContaining("recipe-detail-overflow-scrolled.png")
  ]));
  expect(browser.close).toHaveBeenCalledOnce();
  expect(server.close).toHaveBeenCalledOnce();
});

it.each([
  [{ wrongRow: true }, "row differs from the app widget configuration"],
  [{ clipped: true }, "Wrapped text is clipped"],
  [{ moved: true }, "Pinned controls moved"],
  [{ hiddenTail: true }, "Final text line is clipped"],
  [{ small: true }, "is 40 bytes"],
  [{ wrongSize: true }, "Expected 416×416"]
])("rejects bad visual output and releases browser and server (%j)", async (options, message) => {
  const { browser, server } = setup(options);
  await expect(runWatchPreview({ previewRoot: "preview" })).rejects.toThrow(message);
  expect(browser.close).toHaveBeenCalledOnce();
  expect(server.close).toHaveBeenCalledOnce();
});

it("rejects an escaped screenshot path, invalid manifest and failed exporter", async () => {
  setup();
  readFile.mockResolvedValueOnce(JSON.stringify([{ ...scenes[0], screenshotFile: "../escaped.png" }]));
  await expect(runWatchPreview({ previewRoot: "preview" })).rejects.toThrow("outside the screenshot root");
  readFile.mockResolvedValueOnce("[]");
  await expect(runWatchPreview({ previewRoot: "preview" })).rejects.toThrow("manifest is empty");
  spawn.mockImplementationOnce(() => {
    const child = new EventEmitter();
    queueMicrotask(() => child.emit("exit", 8));
    return child;
  });
  await expect(runWatchPreview({ previewRoot: "preview" })).rejects.toThrow("exit code 8");
});

it("rejects page errors and closes the server even if Chromium cannot start", async () => {
  const { browser, server, page, listeners } = setup();
  page.goto.mockImplementationOnce(() => {
    listeners.get("console")({ type: () => "error", text: () => "Missing asset" });
    listeners.get("pageerror")(new Error("Broken widget"));
  });
  await expect(runWatchPreview({ previewRoot: "preview" })).rejects.toThrow("Broken widget");
  launch.mockRejectedValueOnce(new Error("Chromium failed to start"));
  await expect(runWatchPreview({ previewRoot: "preview" })).rejects.toThrow("Chromium failed to start");
  expect(browser.close).toHaveBeenCalledOnce();
  expect(server.close).toHaveBeenCalledTimes(2);
});
