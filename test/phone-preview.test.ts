import { readFile, writeFile, mkdir } from "node:fs/promises";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { runPhonePreview } from "../scripts/phone-preview.mjs";
import { verifyPhoneFlows } from "./fixtures/phone-preview/flows.mjs";

const { launch, collectCoverage, writeReports } = vi.hoisted(() => ({
  launch: vi.fn(),
  collectCoverage: vi.fn(),
  writeReports: vi.fn()
}));
vi.mock("playwright-core", () => ({ chromium: { launch } }));
vi.mock("node:fs/promises", async (importOriginal) => ({
  ...await importOriginal<typeof import("node:fs/promises")>(),
  readFile: vi.fn(async () => Buffer.from([137, 80, 78, 71])),
  writeFile: vi.fn(),
  mkdir: vi.fn()
}));
vi.mock("../scripts/phone-preview-coverage.mjs", () => ({ collectPhonePreviewCoverage: collectCoverage }));
vi.mock("../scripts/istanbul-coverage-report.mjs", () => ({ writeIstanbulReports: writeReports }));
vi.mock("./fixtures/phone-preview/flows.mjs", () => ({ verifyPhoneFlows: vi.fn() }));

function createMockBrowser({ rejectLayout = false, incorrectStep = false } = {}) {
  let html = "";
  const screenshot = vi.fn();
  const getDeviceWidth = vi.fn();
  const locator = vi.fn((selector: string) => ({
    evaluate: vi.fn(() => selector === "#root" && rejectLayout ? ["outside the viewport: Name"] : []),
    screenshot,
    scrollIntoViewIfNeeded: vi.fn()
  }));
  const parse = (regex: RegExp) => [...html.matchAll(regex)];
  const stepOptions = () => parse(/<option [^>]*>([^<]*)<\/option>/g).filter(([, text]) => /^\d+\. /.test(text));
  const decode = (text: string) => text.replace(/&#39;/g, "'").replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
  const page = {
    locator, getByText: vi.fn(() => ({ and: () => ({ evaluate: vi.fn() }) })),
    getByRole: vi.fn((role: string) => role === "textbox"
      ? {
          inputValue: () => incorrectStep ? "Wrong step" : decode(
            parse(/<textarea [^>]*>([^<]*)<\/textarea>/g)[1]?.[1] ?? ""
          )
        }
      : {
          locator: (selector: string) => ({
            count: () => stepOptions().length,
            last: () => ({ textContent: () => decode(stepOptions().at(-1)?.[1] ?? "") }),
            textContent: () => decode(parse(/<option [^>]*selected>([^<]*)<\/option>/g)
              .find(([, text]) => /^\d+\. /.test(text))?.[1] ?? "")
          })
        }),
    setViewportSize: getDeviceWidth,
    setDefaultTimeout: vi.fn(),
    setContent: vi.fn((value: string) => { html = value; }),
    exposeFunction: vi.fn(),
    evaluate: vi.fn(),
    close: vi.fn()
  };
  const browser = { newPage: vi.fn(async () => page), close: vi.fn() };
  launch.mockResolvedValue(browser);
  return { browser, page, screenshot };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(verifyPhoneFlows).mockReset();
});
afterEach(() => vi.unstubAllGlobals());

it("renders every locale and width in screenshot mode and writes a complete manifest", async () => {
  const { browser, page, screenshot } = createMockBrowser();
  await runPhonePreview([], { outputDir: "phone-output" });
  expect(readFile).toHaveBeenCalledTimes(6);
  expect(page.setContent).toHaveBeenCalledTimes(72);
  expect(page.setViewportSize.mock.calls.map(([viewport]) => viewport.width)).toEqual(
    Array.from({ length: 24 }, () => [360, 390, 430]).flat()
  );
  expect(screenshot).toHaveBeenCalledTimes(144);
  expect(mkdir).toHaveBeenCalledWith(expect.stringContaining("pl-PL"), { recursive: true });
  expect(writeFile).toHaveBeenCalledWith(expect.stringContaining("README.txt"), expect.stringContaining("Scenarios verified: 72"));
  expect(page.setContent.mock.calls.some(([html]) => html.includes("data:image/png;base64,"))).toBe(true);
  expect(browser.close).toHaveBeenCalledOnce();
}, 12_000);

it.each([
  [{ rejectLayout: true }, "outside the viewport"],
  [{ incorrectStep: true }, "selected step instructions do not match"]
])("reports a bad preview and closes Chromium (%j)", async (options, message) => {
  const { browser } = createMockBrowser(options);
  await expect(runPhonePreview([], { outputDir: "unused" })).rejects.toThrow(message);
  expect(writeFile).not.toHaveBeenCalled();
  expect(browser.close).toHaveBeenCalledOnce();
});

it("binds interactive controls to the selected Settings instance for each locale", async () => {
  const { browser, page } = createMockBrowser();
  await runPhonePreview(["--verify-flow"]);
  expect(verifyPhoneFlows).toHaveBeenCalledTimes(2);
  expect(vi.mocked(verifyPhoneFlows).mock.calls.map(([, , locale]) => locale)).toEqual(["en-US", "pl-PL"]);
  expect(browser.newPage.mock.calls.map(([options]) => options.viewport.width)).toEqual([390, 360]);
  for (const [name, action] of page.exposeFunction.mock.calls) {
    expect(name).toBe("applySettingsAction");
    const updated = action(0, undefined, true);
    expect(updated).toContain("data-action=");
  }
  expect(page.close).toHaveBeenCalledTimes(2);
  expect(browser.close).toHaveBeenCalledOnce();
});

it("writes coverage only after completed interactive verification", async () => {
  createMockBrowser();
  const report = { files: () => ["Settings"] };
  collectCoverage.mockImplementation(async (_path, source, run) => {
    expect(source).toContain("sourceMappingURL");
    await run();
    return report;
  });
  await runPhonePreview(["--coverage"], { coverageDir: "phone-report" });
  expect(writeReports).toHaveBeenCalledWith(report, "phone-report");
  expect(verifyPhoneFlows).toHaveBeenCalledTimes(2);
  expect(writeFile).not.toHaveBeenCalled();
});

it("delivers delegated button events in order and updates the preview with the new Settings tree", async () => {
  const { page } = createMockBrowser();
  const handlers = new Map();
  const root = {
    innerHTML: "",
    addEventListener: (event, handler) => { handlers.set(event, handler); }
  };
  const window = { settingsActionsSettled: Promise.resolve() };
  vi.stubGlobal("window", window);
  vi.stubGlobal("document", { getElementById: () => root });
  page.exposeFunction.mockImplementation((_name, callback) => {
    window.applySettingsAction = (id, value, rebuild) => Promise.resolve(callback(id, value, rebuild));
  });
  page.evaluate.mockImplementation((callback) => callback());
  vi.mocked(verifyPhoneFlows).mockImplementation(async () => {
    const control = { dataset: { action: "1" } };
    handlers.get("click")({ target: { closest: () => control } });
    await window.settingsActionsSettled;
    expect(root.innerHTML).toContain("data-action=");
    for (const event of ["input", "change"]) {
      handlers.get(event)({ target: { matches: () => false } });
    }
    expect(root.innerHTML.length).toBeGreaterThan(100);
  });
  await runPhonePreview(["--verify-flow"]);
  expect(handlers.size).toBe(3);
});
