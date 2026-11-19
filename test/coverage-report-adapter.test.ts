import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { beforeEach, expect, it, vi } from "vitest";
import { isCliEntry } from "../scripts/cli-entry.mjs";
import { collectPhonePreviewCoverage } from "../scripts/phone-preview-coverage.mjs";
import { writeIstanbulReports } from "../scripts/istanbul-coverage-report.mjs";
import istanbulCoverage from "istanbul-lib-coverage";

const { connect, disconnect, post, mkdir, writeFile, execute, create, createContext } = vi.hoisted(() => ({
  connect: vi.fn(), disconnect: vi.fn(), post: vi.fn(), mkdir: vi.fn(), writeFile: vi.fn(),
  execute: vi.fn(), create: vi.fn(), createContext: vi.fn()
}));
vi.mock("node:inspector/promises", () => ({
  Session: class {
    connect = connect;
    disconnect = disconnect;
    post = post;
  }
}));
vi.mock("node:fs/promises", () => ({ mkdir, writeFile }));
vi.mock("istanbul-reports", () => ({ default: { create } }));
vi.mock("istanbul-lib-report", () => ({ default: { createContext } }));

const bundle = resolve("fixture-bundle.js");
const source = "function brew() { return 1; }\nbrew();\n";
const functions = [{ functionName: "brew", isBlockCoverage: true, ranges: [{ startOffset: 0, endOffset: 29, count: 1 }] }];

beforeEach(() => {
  vi.resetAllMocks();
  create.mockReturnValue({ execute });
});

it("identifies the executed script without changing imported modules' process status", () => {
  expect(isCliEntry(pathToFileURL(bundle).href, bundle)).toBe(true);
  expect(isCliEntry(pathToFileURL(bundle).href, resolve("other.js"))).toBe(false);
  expect(isCliEntry(pathToFileURL(bundle).href, "")).toBe(false);
});

it("collects only the VM script and ends recording after failed flows", async () => {
  const run = vi.fn();
  post.mockImplementation(async (command) => command === "Profiler.takePreciseCoverage"
    ? { result: [{ url: "node:internal/buffer" }, { url: pathToFileURL(bundle).href, functions }] } : {});
  const map = await collectPhonePreviewCoverage(bundle, source, run);
  expect(map.files()).toEqual([bundle]);
  expect(run).toHaveBeenCalledOnce();
  expect(post.mock.calls.map(([method]) => method)).toEqual([
    "Profiler.enable", "Profiler.startPreciseCoverage", "Profiler.takePreciseCoverage", "Profiler.stopPreciseCoverage"
  ]);
  expect(disconnect).toHaveBeenCalledOnce();
  await expect(collectPhonePreviewCoverage(bundle, source, () => { throw new Error("Flow failed"); })).rejects.toThrow("Flow failed");
  expect(disconnect).toHaveBeenCalledTimes(2);
});

it("reports empty coverage and writes all artifact formats from a coverage summary", async () => {
  post.mockResolvedValue({ result: [] });
  await expect(collectPhonePreviewCoverage(bundle, source, vi.fn())).rejects.toThrow("did not capture");
  const coverageMap = istanbulCoverage.createCoverageMap({});
  const context = { dir: "report" };
  createContext.mockReturnValue(context);
  const summary = await writeIstanbulReports(coverageMap, "report");
  expect(mkdir).toHaveBeenCalledWith("report", { recursive: true });
  expect(createContext).toHaveBeenCalledWith({ dir: "report", coverageMap });
  expect(create.mock.calls.map(([type]) => type)).toEqual(["html", "json", "lcovonly", "text-summary"]);
  expect(execute).toHaveBeenCalledTimes(4);
  const [destination, content] = writeFile.mock.calls[0];
  expect(destination).toMatch(/summary\.json$/);
  expect(JSON.parse(content)).toEqual(summary);
});
